import express from 'express'
import { body, validationResult } from 'express-validator'
import Comment from '../models/Comment.js'
import Post from '../models/Post.js'
import { protect, optionalAuth, authorize } from '../middleware/authMiddleware.js'
import { validationError } from '../middleware/errorMiddleware.js'

const router = express.Router()

// 获取评论列表（支持分页）
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const postId = req.query.post || ''
    const parentId = req.query.parent || ''
    const authorId = req.query.author || ''
    const sortBy = req.query.sortBy || 'createdAt'
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1

    const skip = (page - 1) * limit
    
    // 构建查询条件
    let query = { isDeleted: false }
    
    if (postId) {
      query.post = postId
    }
    
    if (parentId) {
      query.parent = parentId
    } else {
      query.parent = null // 默认只获取顶级评论
    }
    
    if (authorId) {
      query.author = authorId
    }

    // 构建排序条件
    const sort = {}
    sort[sortBy] = sortOrder

    // 获取评论列表
    const comments = await Comment.find(query)
      .populate('author', 'username avatar level')
      .populate('parent', 'content author')
      .populate('post', 'title')
      .sort(sort)
      .skip(skip)
      .limit(limit)

    // 获取总数
    const total = await Comment.countDocuments(query)

    res.json({
      success: true,
      data: {
        comments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('获取评论列表错误:', error)
    res.status(500).json({
      success: false,
      error: '获取评论列表失败'
    })
  }
})

// 创建评论
router.post('/', protect, [
  body('content')
    .isLength({ min: 1, max: 2000 })
    .withMessage('评论内容长度必须在1-2000个字符之间'),
  body('post')
    .notEmpty()
    .withMessage('请选择帖子')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json(validationError(errors))
    }

    const { content, post: postId, parent: parentId, images = [], isAnonymous = false } = req.body

    // 检查帖子是否存在
    const post = await Post.findById(postId)
    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        error: '帖子不存在'
      })
    }

    // 检查父评论是否存在（如果是回复评论）
    let parentComment = null
    if (parentId) {
      parentComment = await Comment.findById(parentId)
      if (!parentComment || parentComment.isDeleted) {
        return res.status(404).json({
          success: false,
          error: '父评论不存在'
        })
      }
    }

    // 创建评论
    const comment = await Comment.create({
      content,
      author: req.user._id,
      post: postId,
      parent: parentId,
      images,
      isAnonymous
    })

    // 更新帖子评论数
    post.commentsCount += 1
    await post.save()

    // 更新父评论的回复数（如果是回复评论）
    if (parentComment) {
      parentComment.repliesCount += 1
      await parentComment.save()
    }

    // 更新用户经验值
    await req.user.addExperience(2) // 评论获得2点经验

    res.status(201).json({
      success: true,
      message: '评论发布成功',
      data: { comment }
    })
  } catch (error) {
    console.error('创建评论错误:', error)
    res.status(500).json({
      success: false,
      error: '评论发布失败'
    })
  }
})

// 获取评论详情
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id)
      .populate('author', 'username avatar level')
      .populate('parent', 'content author')
      .populate('post', 'title')

    if (!comment || comment.isDeleted) {
      return res.status(404).json({
        success: false,
        error: '评论不存在'
      })
    }

    res.json({
      success: true,
      data: { comment }
    })
  } catch (error) {
    console.error('获取评论详情错误:', error)
    res.status(500).json({
      success: false,
      error: '获取评论详情失败'
    })
  }
})

// 更新评论（需要作者权限）
router.put('/:id', protect, authorize(), [
  body('content').optional().isLength({ min: 1, max: 2000 }).withMessage('评论内容长度必须在1-2000个字符之间')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json(validationError(errors))
    }

    const { content, images } = req.body

    const updateData = {}
    if (content) updateData.content = content
    if (images) updateData.images = images

    const comment = await Comment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('author', 'username avatar level')
    .populate('parent', 'content author')
    .populate('post', 'title')

    res.json({
      success: true,
      message: '评论更新成功',
      data: { comment }
    })
  } catch (error) {
    console.error('更新评论错误:', error)
    res.status(500).json({
      success: false,
      error: '评论更新失败'
    })
  }
})

// 删除评论（需要作者或版主权限）
router.delete('/:id', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id)
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: '评论不存在'
      })
    }

    // 检查权限：作者、贴吧版主或管理员
    const isAuthor = comment.author.toString() === req.user._id.toString()
    const isAdmin = req.user.role === 'admin'
    
    let isModerator = false
    if (!isAuthor && !isAdmin) {
      // 获取帖子对应的贴吧
      const post = await Post.findById(comment.post)
      if (post) {
        const Tieba = (await import('../models/Tieba.js')).default
        const tieba = await Tieba.findById(post.tieba)
        if (tieba) {
          isModerator = tieba.moderators.some(mod => 
            mod.toString() === req.user._id.toString()
          ) || tieba.creator.toString() === req.user._id.toString()
        }
      }
    }

    if (!isAuthor && !isAdmin && !isModerator) {
      return res.status(403).json({
        success: false,
        error: '无权删除此评论'
      })
    }

    // 软删除评论
    comment.isDeleted = true
    await comment.save()

    // 更新帖子评论数
    await Post.findByIdAndUpdate(comment.post, {
      $inc: { commentsCount: -1 }
    })

    // 更新父评论的回复数（如果是回复评论）
    if (comment.parent) {
      await Comment.findByIdAndUpdate(comment.parent, {
        $inc: { repliesCount: -1 }
      })
    }

    res.json({
      success: true,
      message: '评论删除成功'
    })
  } catch (error) {
    console.error('删除评论错误:', error)
    res.status(500).json({
      success: false,
      error: '评论删除失败'
    })
  }
})

// 点赞评论
router.post('/:id/like', protect, async (req, res) => {
  try {
    const commentId = req.params.id
    
    const comment = await Comment.findById(commentId)
    if (!comment || comment.isDeleted) {
      return res.status(404).json({
        success: false,
        error: '评论不存在'
      })
    }

    // 检查是否已点赞
    const Like = (await import('../models/Like.js')).default
    const existingLike = await Like.findOne({
      user: req.user._id,
      comment: commentId
    })

    if (existingLike) {
      return res.status(400).json({
        success: false,
        error: '您已经点赞过此评论'
      })
    }

    // 创建点赞关系
    await Like.create({
      user: req.user._id,
      comment: commentId,
      type: 'comment'
    })

    // 更新评论点赞数
    comment.likesCount += 1
    await comment.save()

    res.json({
      success: true,
      message: '点赞成功'
    })
  } catch (error) {
    console.error('点赞评论错误:', error)
    res.status(500).json({
      success: false,
      error: '点赞失败'
    })
  }
})

// 取消点赞评论
router.delete('/:id/like', protect, async (req, res) => {
  try {
    const commentId = req.params.id
    
    const Like = (await import('../models/Like.js')).default
    const like = await Like.findOneAndDelete({
      user: req.user._id,
      comment: commentId
    })

    if (!like) {
      return res.status(400).json({
        success: false,
        error: '您还未点赞此评论'
      })
    }

    // 更新评论点赞数
    await Comment.findByIdAndUpdate(commentId, {
      $inc: { likesCount: -1 }
    })

    res.json({
      success: true,
      message: '取消点赞成功'
    })
  } catch (error) {
    console.error('取消点赞评论错误:', error)
    res.status(500).json({
      success: false,
      error: '取消点赞失败'
    })
  }
})

// 获取评论的回复列表
router.get('/:id/replies', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const sortBy = req.query.sortBy || 'createdAt'
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1

    const skip = (page - 1) * limit
    
    // 构建查询条件
    const query = {
      parent: req.params.id,
      isDeleted: false
    }

    // 构建排序条件
    const sort = {}
    sort[sortBy] = sortOrder

    // 获取回复列表
    const replies = await Comment.find(query)
      .populate('author', 'username avatar level')
      .populate('parent', 'content author')
      .sort(sort)
      .skip(skip)
      .limit(limit)

    // 获取总数
    const total = await Comment.countDocuments(query)

    res.json({
      success: true,
      data: {
        replies,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('获取评论回复错误:', error)
    res.status(500).json({
      success: false,
      error: '获取评论回复失败'
    })
  }
})

// 检查是否已点赞评论
router.get('/:id/interaction-status', protect, async (req, res) => {
  try {
    const commentId = req.params.id
    
    const Like = (await import('../models/Like.js')).default
    const isLiked = await Like.exists({ 
      user: req.user._id, 
      comment: commentId 
    })

    res.json({
      success: true,
      data: {
        isLiked: !!isLiked
      }
    })
  } catch (error) {
    console.error('检查评论互动状态错误:', error)
    res.status(500).json({
      success: false,
      error: '检查评论互动状态失败'
    })
  }
})

export default router