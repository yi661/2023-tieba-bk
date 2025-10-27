import express from 'express'
import { body, query, validationResult } from 'express-validator'
import { protect, optionalAuth } from '../middleware/authMiddleware.js'
import Post from '../models/Post.js'
import Tieba from '../models/Tieba.js'
import User from '../models/User.js'

const router = express.Router()

// 全局搜索
router.get('/global',
  [
    query('q').trim().isLength({ min: 1, max: 100 }).withMessage('搜索关键词长度必须在1-100字符之间'),
    query('type').optional().isIn(['all', 'posts', 'tiebas', 'users']).withMessage('搜索类型必须是all、posts、tiebas或users'),
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('每页数量必须在1-50之间')
  ],
  optionalAuth,
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        })
      }

      const { q, type = 'all', page = 1, limit = 20 } = req.query
      const skip = (page - 1) * limit

      let results = {}
      const searchRegex = new RegExp(q, 'i')

      // 搜索帖子
      if (type === 'all' || type === 'posts') {
        const posts = await Post.find({
          $or: [
            { title: searchRegex },
            { content: searchRegex }
          ],
          status: 'published'
        })
        .populate('author', 'username avatar displayName')
        .populate('tieba', 'name avatar memberCount')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)

        results.posts = posts
        results.postsCount = await Post.countDocuments({
          $or: [
            { title: searchRegex },
            { content: searchRegex }
          ],
          status: 'published'
        })
      }

      // 搜索贴吧
      if (type === 'all' || type === 'tiebas') {
        const tiebas = await Tieba.find({
          $or: [
            { name: searchRegex },
            { description: searchRegex }
          ],
          status: 'active'
        })
        .sort({ memberCount: -1 })
        .skip(skip)
        .limit(limit)

        results.tiebas = tiebas
        results.tiebasCount = await Tieba.countDocuments({
          $or: [
            { name: searchRegex },
            { description: searchRegex }
          ],
          status: 'active'
        })
      }

      // 搜索用户
      if (type === 'all' || type === 'users') {
        const users = await User.find({
          $or: [
            { username: searchRegex },
            { displayName: searchRegex }
          ],
          status: 'active'
        })
        .select('username avatar displayName bio followersCount followingCount')
        .sort({ followersCount: -1 })
        .skip(skip)
        .limit(limit)

        results.users = users
        results.usersCount = await User.countDocuments({
          $or: [
            { username: searchRegex },
            { displayName: searchRegex }
          ],
          status: 'active'
        })
      }

      res.json({
        success: true,
        data: results,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: (results.postsCount || 0) + (results.tiebasCount || 0) + (results.usersCount || 0)
        }
      })

    } catch (error) {
      console.error('搜索错误:', error)
      res.status(500).json({
        success: false,
        message: '搜索失败，请稍后重试'
      })
    }
  }
)

// 贴吧内搜索
router.get('/tieba/:tiebaId',
  [
    query('q').trim().isLength({ min: 1, max: 100 }).withMessage('搜索关键词长度必须在1-100字符之间'),
    query('type').optional().isIn(['all', 'posts', 'comments']).withMessage('搜索类型必须是all、posts或comments'),
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('每页数量必须在1-50之间')
  ],
  optionalAuth,
  async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '参数验证失败',
          errors: errors.array()
        })
      }

      const { tiebaId } = req.params
      const { q, type = 'all', page = 1, limit = 20 } = req.query
      const skip = (page - 1) * limit

      // 验证贴吧存在
      const tieba = await Tieba.findById(tiebaId)
      if (!tieba) {
        return res.status(404).json({
          success: false,
          message: '贴吧不存在'
        })
      }

      const searchRegex = new RegExp(q, 'i')
      let results = {}

      // 搜索帖子
      if (type === 'all' || type === 'posts') {
        const posts = await Post.find({
          tieba: tiebaId,
          $or: [
            { title: searchRegex },
            { content: searchRegex }
          ],
          status: 'published'
        })
        .populate('author', 'username avatar displayName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)

        results.posts = posts
        results.postsCount = await Post.countDocuments({
          tieba: tiebaId,
          $or: [
            { title: searchRegex },
            { content: searchRegex }
          ],
          status: 'published'
        })
      }

      res.json({
        success: true,
        data: results,
        tieba: {
          id: tieba._id,
          name: tieba.name,
          avatar: tieba.avatar
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: results.postsCount || 0
        }
      })

    } catch (error) {
      console.error('贴吧搜索错误:', error)
      res.status(500).json({
        success: false,
        message: '搜索失败，请稍后重试'
      })
    }
  }
)

// 热门搜索关键词
router.get('/trending', async (req, res) => {
  try {
    // 这里可以集成搜索统计服务
    // 暂时返回一些示例关键词
    const trendingKeywords = [
      { keyword: '游戏', count: 1250 },
      { keyword: '学习', count: 980 },
      { keyword: '技术', count: 760 },
      { keyword: '生活', count: 650 },
      { keyword: '娱乐', count: 540 }
    ]

    res.json({
      success: true,
      data: trendingKeywords
    })

  } catch (error) {
    console.error('获取热门搜索错误:', error)
    res.status(500).json({
      success: false,
      message: '获取热门搜索失败'
    })
  }
})

export default router