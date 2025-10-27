import express from 'express'
import { body, validationResult } from 'express-validator'
import Post from '../models/Post.js'
import Tieba from '../models/Tieba.js'
import { protect, optionalAuth, authorize } from '../middleware/authMiddleware.js'
import { validationError } from '../middleware/errorMiddleware.js'

const router = express.Router()

// 获取帖子列表（支持搜索、分类和分页）
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const search = req.query.search || ''
    const tiebaId = req.query.tieba || ''
    const authorId = req.query.author || ''
    const type = req.query.type || 'all'
    const sortBy = req.query.sortBy || 'createdAt'
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1

    const skip = (page - 1) * limit
    
    // 构建查询条件
    let query = { isDeleted: false }
    
    if (search) {
      const regex = new RegExp(search, 'i')
      query.$or = [
        { title: regex },
        { content: regex },
        { tags: regex }
      ]
    }
    
    if (tiebaId) {
      query.tieba = tiebaId
    }
    
    if (authorId) {
      query.author = authorId
    }
    
    if (type !== 'all') {
      query.type = type
    }

    // 构建排序条件
    let sort = {}
    if (sortBy === 'hot') {
      // 热门度计算：浏览量*0.3 + 点赞数*0.4 + 评论数*0.3
      sort = {
        $expr: {
          $add: [
            { $multiply: ['$viewsCount', 0.3] },
            { $multiply: ['$likesCount', 0.4] },
            { $multiply: ['$commentsCount', 0.3] }
          ]
        }
      }
    } else {
      sort[sortBy] = sortOrder
    }

    // 获取帖子列表
    const posts = await Post.find(query)
      .populate('author', 'username avatar level')
      .populate('tieba', 'name avatar')
      .sort(sort)
      .skip(skip)
      .limit(limit)

    // 获取总数
    const total = await Post.countDocuments(query)

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('获取帖子列表错误:', error)
    res.status(500).json({
      success: false,
      error: '获取帖子列表失败'
    })
  }
})

// 获取热门帖子
router.get('/hot', optionalAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10
    
    const posts = await Post.getHotPosts(limit)

    res.json({
      success: true,
      data: { posts }
    })
  } catch (error) {
    console.error('获取热门帖子错误:', error)
    res.status(500).json({
      success: false,
      error: '获取热门帖子失败'
    })
  }
})

// 创建帖子
router.post('/', protect, [
  body('title')
    .isLength({ min: 2, max: 100 })
    .withMessage('帖子标题长度必须在2-100个字符之间'),
  body('content')
    .isLength({ min: 1, max: 10000 })
    .withMessage('帖子内容长度必须在1-10000个字符之间'),
  body('tieba')
    .notEmpty()
    .withMessage('请选择贴吧')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json(validationError(errors))
    }

    const { title, content, tieba: tiebaId, images = [], videos = [], tags = [], isAnonymous = false } = req.body

    // 检查贴吧是否存在
    const tieba = await Tieba.findById(tiebaId)
    if (!tieba) {
      return res.status(404).json({
        success: false,
        error: '贴吧不存在'
      })
    }

    // 检查用户是否已加入贴吧
    const Member = (await import('../models/Member.js')).default
    const isMember = await Member.exists({
      user: req.user._id,
      tieba: tiebaId
    })

    if (!isMember && tieba.joinRequirement !== 'free') {
      return res.status(403).json({
        success: false,
        error: '请先加入该贴吧才能发帖'
      })
    }

    // 创建帖子
    const post = await Post.create({
      title,
      content,
      author: req.user._id,
      tieba: tiebaId,
      images,
      videos,
      tags,
      isAnonymous
    })

    // 更新贴吧帖子数和今日帖子数
    await tieba.updateTodayPosts()
    await tieba.updatePopularity()

    // 更新用户帖子数
    await req.user.addExperience(10) // 发帖获得10点经验

    res.status(201).json({
      success: true,
      message: '帖子发布成功',
      data: { post }
    })
  } catch (error) {
    console.error('创建帖子错误:', error)
    res.status(500).json({
      success: false,
      error: '帖子发布失败'
    })
  }
})

// 获取帖子详情
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'username avatar level')
      .populate('tieba', 'name avatar')

    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        error: '帖子不存在'
      })
    }

    // 增加浏览量（如果是已登录用户）
    if (req.user && req.user._id.toString() !== post.author._id.toString()) {
      await post.incrementViews()
    }

    res.json({
      success: true,
      data: { post }
    })
  } catch (error) {
    console.error('获取帖子详情错误:', error)
    res.status(500).json({
      success: false,
      error: '获取帖子详情失败'
    })
  }
})

// 更新帖子（需要作者权限）
router.put('/:id', protect, authorize(), [
  body('title').optional().isLength({ min: 2, max: 100 }).withMessage('帖子标题长度必须在2-100个字符之间'),
  body('content').optional().isLength({ min: 1, max: 10000 }).withMessage('帖子内容长度必须在1-10000个字符之间')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json(validationError(errors))
    }

    const { title, content, images, videos, tags } = req.body

    const updateData = {}
    if (title) updateData.title = title
    if (content) updateData.content = content
    if (images) updateData.images = images
    if (videos) updateData.videos = videos
    if (tags) updateData.tags = tags

    const post = await Post.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('author', 'username avatar level')
    .populate('tieba', 'name avatar')

    res.json({
      success: true,
      message: '帖子更新成功',
      data: { post }
    })
  } catch (error) {
    console.error('更新帖子错误:', error)
    res.status(500).json({
      success: false,
      error: '帖子更新失败'
    })
  }
})

// 删除帖子（需要作者或版主权限）
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: '帖子不存在'
      })
    }

    // 检查权限：作者、贴吧版主或管理员
    const isAuthor = post.author.toString() === req.user._id.toString()
    const isAdmin = req.user.role === 'admin'
    
    let isModerator = false
    if (!isAuthor && !isAdmin) {
      const tieba = await Tieba.findById(post.tieba)
      isModerator = tieba.moderators.some(mod => 
        mod.toString() === req.user._id.toString()
      ) || tieba.creator.toString() === req.user._id.toString()
    }

    if (!isAuthor && !isAdmin && !isModerator) {
      return res.status(403).json({
        success: false,
        error: '无权删除此帖子'
      })
    }

    // 软删除帖子
    post.isDeleted = true
    await post.save()

    res.json({
      success: true,
      message: '帖子删除成功'
    })
  } catch (error) {
    console.error('删除帖子错误:', error)
    res.status(500).json({
      success: false,
      error: '帖子删除失败'
    })
  }
})

// 点赞帖子
router.post('/:id/like', protect, async (req, res) => {
  try {
    const postId = req.params.id
    
    const post = await Post.findById(postId)
    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        error: '帖子不存在'
      })
    }

    // 检查是否已点赞
    const Like = (await import('../models/Like.js')).default
    const existingLike = await Like.findOne({
      user: req.user._id,
      post: postId
    })

    if (existingLike) {
      return res.status(400).json({
        success: false,
        error: '您已经点赞过此帖子'
      })
    }

    // 创建点赞关系
    await Like.create({
      user: req.user._id,
      post: postId,
      type: 'post'
    })

    // 更新帖子点赞数
    post.likesCount += 1
    await post.save()

    res.json({
      success: true,
      message: '点赞成功'
    })
  } catch (error) {
    console.error('点赞帖子错误:', error)
    res.status(500).json({
      success: false,
      error: '点赞失败'
    })
  }
})

// 取消点赞
router.delete('/:id/like', protect, async (req, res) => {
  try {
    const postId = req.params.id
    
    const Like = (await import('../models/Like.js')).default
    const like = await Like.findOneAndDelete({
      user: req.user._id,
      post: postId
    })

    if (!like) {
      return res.status(400).json({
        success: false,
        error: '您还未点赞此帖子'
      })
    }

    // 更新帖子点赞数
    await Post.findByIdAndUpdate(postId, {
      $inc: { likesCount: -1 }
    })

    res.json({
      success: true,
      message: '取消点赞成功'
    })
  } catch (error) {
    console.error('取消点赞错误:', error)
    res.status(500).json({
      success: false,
      error: '取消点赞失败'
    })
  }
})

// 收藏帖子
router.post('/:id/favorite', protect, async (req, res) => {
  try {
    const postId = req.params.id
    
    const post = await Post.findById(postId)
    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        error: '帖子不存在'
      })
    }

    // 检查是否已收藏
    const Favorite = (await import('../models/Favorite.js')).default
    const existingFavorite = await Favorite.findOne({
      user: req.user._id,
      post: postId
    })

    if (existingFavorite) {
      return res.status(400).json({
        success: false,
        error: '您已经收藏过此帖子'
      })
    }

    // 创建收藏关系
    await Favorite.create({
      user: req.user._id,
      post: postId
    })

    // 更新帖子收藏数
    post.favoritesCount += 1
    await post.save()

    res.json({
      success: true,
      message: '收藏成功'
    })
  } catch (error) {
    console.error('收藏帖子错误:', error)
    res.status(500).json({
      success: false,
      error: '收藏失败'
    })
  }
})

// 取消收藏
router.delete('/:id/favorite', protect, async (req, res) => {
  try {
    const postId = req.params.id
    
    const Favorite = (await import('../models/Favorite.js')).default
    const favorite = await Favorite.findOneAndDelete({
      user: req.user._id,
      post: postId
    })

    if (!favorite) {
      return res.status(400).json({
        success: false,
        error: '您还未收藏此帖子'
      })
    }

    // 更新帖子收藏数
    await Post.findByIdAndUpdate(postId, {
      $inc: { favoritesCount: -1 }
    })

    res.json({
      success: true,
      message: '取消收藏成功'
    })
  } catch (error) {
    console.error('取消收藏错误:', error)
    res.status(500).json({
      success: false,
      error: '取消收藏失败'
    })
  }
})

// 检查是否已点赞/收藏
router.get('/:id/interaction-status', protect, async (req, res) => {
  try {
    const postId = req.params.id
    
    const Like = (await import('../models/Like.js')).default
    const Favorite = (await import('../models/Favorite.js')).default
    
    const [isLiked, isFavorited] = await Promise.all([
      Like.exists({ user: req.user._id, post: postId }),
      Favorite.exists({ user: req.user._id, post: postId })
    ])

    res.json({
      success: true,
      data: {
        isLiked: !!isLiked,
        isFavorited: !!isFavorited
      }
    })
  } catch (error) {
    console.error('检查互动状态错误:', error)
    res.status(500).json({
      success: false,
      error: '检查互动状态失败'
    })
  }
})

export default router