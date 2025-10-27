import express from 'express'
import { body, validationResult } from 'express-validator'
import Favorite from '../models/Favorite.js'
import Post from '../models/Post.js'
import { protect } from '../middleware/authMiddleware.js'
import { validationError } from '../middleware/errorMiddleware.js'

const router = express.Router()

// 获取用户的收藏列表
router.get('/my-favorites', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const folder = req.query.folder || 'all'

    const result = await Favorite.getUserFavorites(req.user._id, page, limit, folder)

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('获取收藏列表错误:', error)
    res.status(500).json({
      success: false,
      error: '获取收藏列表失败'
    })
  }
})

// 获取帖子的收藏用户列表
router.get('/post/:postId', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20

    const result = await Favorite.getPostFavorites(req.params.postId, page, limit)

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('获取帖子收藏列表错误:', error)
    res.status(500).json({
      success: false,
      error: '获取帖子收藏列表失败'
    })
  }
})

// 收藏帖子
router.post('/', protect, [
  body('postId')
    .notEmpty()
    .withMessage('请选择要收藏的帖子'),
  body('folder')
    .optional()
    .isLength({ max: 50 })
    .withMessage('文件夹名称不能超过50个字符'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('标签必须是数组'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('备注不能超过500个字符')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json(validationError(errors))
    }

    const { postId, folder = 'default', tags = [], notes = '' } = req.body

    // 检查帖子是否存在
    const post = await Post.findById(postId)
    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        error: '帖子不存在'
      })
    }

    // 检查是否已收藏
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

    // 创建收藏
    const favorite = await Favorite.create({
      user: req.user._id,
      post: postId,
      folder,
      tags,
      notes
    })

    // 更新帖子收藏数
    post.favoritesCount += 1
    await post.save()

    res.status(201).json({
      success: true,
      message: '收藏成功',
      data: { favorite }
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
router.delete('/:postId', protect, async (req, res) => {
  try {
    const { postId } = req.params

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

// 更新收藏信息
router.put('/:postId', protect, [
  body('folder')
    .optional()
    .isLength({ max: 50 })
    .withMessage('文件夹名称不能超过50个字符'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('标签必须是数组'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('备注不能超过500个字符')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json(validationError(errors))
    }

    const { postId } = req.params
    const { folder, tags, notes } = req.body

    const favorite = await Favorite.findOne({
      user: req.user._id,
      post: postId
    })

    if (!favorite) {
      return res.status(404).json({
        success: false,
        error: '收藏记录不存在'
      })
    }

    await favorite.updateInfo(folder, tags, notes)

    res.json({
      success: true,
      message: '收藏信息更新成功',
      data: { favorite }
    })
  } catch (error) {
    console.error('更新收藏信息错误:', error)
    res.status(500).json({
      success: false,
      error: '更新收藏信息失败'
    })
  }
})

// 批量检查收藏状态
router.post('/batch-check', protect, async (req, res) => {
  try {
    const { postIds } = req.body

    if (!postIds || !Array.isArray(postIds)) {
      return res.status(400).json({
        success: false,
        error: '参数错误：postIds必须为数组'
      })
    }

    const favoritedMap = await Favorite.batchCheckFavorites(req.user._id, postIds)

    res.json({
      success: true,
      data: { favoritedMap }
    })
  } catch (error) {
    console.error('批量检查收藏状态错误:', error)
    res.status(500).json({
      success: false,
      error: '批量检查收藏状态失败'
    })
  }
})

// 获取用户的收藏统计
router.get('/stats', protect, async (req, res) => {
  try {
    const stats = await Favorite.getUserStats(req.user._id)

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('获取收藏统计错误:', error)
    res.status(500).json({
      success: false,
      error: '获取收藏统计失败'
    })
  }
})

// 获取用户的收藏文件夹列表
router.get('/folders', protect, async (req, res) => {
  try {
    const folders = await Favorite.getUserFolders(req.user._id)

    res.json({
      success: true,
      data: { folders }
    })
  } catch (error) {
    console.error('获取收藏文件夹错误:', error)
    res.status(500).json({
      success: false,
      error: '获取收藏文件夹失败'
    })
  }
})

// 按标签搜索收藏
router.get('/search/tags', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const tags = req.query.tags

    if (!tags) {
      return res.status(400).json({
        success: false,
        error: '请提供tags参数'
      })
    }

    const tagArray = Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim())

    const result = await Favorite.searchByTags(req.user._id, tagArray, page, limit)

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('按标签搜索收藏错误:', error)
    res.status(500).json({
      success: false,
      error: '按标签搜索收藏失败'
    })
  }
})

export default router