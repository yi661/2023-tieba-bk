import express from 'express'
import Like from '../models/Like.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

// 获取用户的点赞历史
router.get('/my-likes', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const type = req.query.type || 'all'

    const result = await Like.getUserLikes(req.user._id, page, limit, type)

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('获取点赞历史错误:', error)
    res.status(500).json({
      success: false,
      error: '获取点赞历史失败'
    })
  }
})

// 获取帖子的点赞用户列表
router.get('/post/:postId', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20

    const result = await Like.getPostLikes(req.params.postId, page, limit)

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('获取帖子点赞列表错误:', error)
    res.status(500).json({
      success: false,
      error: '获取帖子点赞列表失败'
    })
  }
})

// 获取评论的点赞用户列表
router.get('/comment/:commentId', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20

    const result = await Like.getCommentLikes(req.params.commentId, page, limit)

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('获取评论点赞列表错误:', error)
    res.status(500).json({
      success: false,
      error: '获取评论点赞列表失败'
    })
  }
})

// 批量检查点赞状态
router.post('/batch-check', protect, async (req, res) => {
  try {
    const { targetIds, type } = req.body

    if (!targetIds || !Array.isArray(targetIds) || !type) {
      return res.status(400).json({
        success: false,
        error: '参数错误：targetIds必须为数组，type必须提供'
      })
    }

    const likedMap = await Like.batchCheckLikes(req.user._id, targetIds, type)

    res.json({
      success: true,
      data: { likedMap }
    })
  } catch (error) {
    console.error('批量检查点赞状态错误:', error)
    res.status(500).json({
      success: false,
      error: '批量检查点赞状态失败'
    })
  }
})

// 获取点赞统计信息
router.get('/stats/:targetId', async (req, res) => {
  try {
    const { targetId } = req.params
    const { type } = req.query

    if (!type) {
      return res.status(400).json({
        success: false,
        error: '请提供type参数（post或comment）'
      })
    }

    let query = {}
    if (type === 'post') {
      query.post = targetId
    } else if (type === 'comment') {
      query.comment = targetId
    } else {
      return res.status(400).json({
        success: false,
        error: 'type参数必须是post或comment'
      })
    }

    const totalLikes = await Like.countDocuments(query)

    // 获取最近点赞的用户（前5个）
    const recentLikes = await Like.find(query)
      .populate('user', 'username avatar level')
      .sort({ createdAt: -1 })
      .limit(5)

    res.json({
      success: true,
      data: {
        totalLikes,
        recentLikes
      }
    })
  } catch (error) {
    console.error('获取点赞统计错误:', error)
    res.status(500).json({
      success: false,
      error: '获取点赞统计失败'
    })
  }
})

export default router