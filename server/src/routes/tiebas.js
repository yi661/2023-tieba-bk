import express from 'express'
import { body, validationResult } from 'express-validator'
import Tieba from '../models/Tieba.js'
import { protect, optionalAuth, tiebaModerator } from '../middleware/authMiddleware.js'
import { validationError } from '../middleware/errorMiddleware.js'

const router = express.Router()

// 获取贴吧列表（支持搜索、分类和分页）
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const search = req.query.search || ''
    const category = req.query.category || ''
    const sortBy = req.query.sortBy || 'popularity'
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1

    const skip = (page - 1) * limit
    
    // 构建查询条件
    let query = {}
    
    if (search) {
      const regex = new RegExp(search, 'i')
      query.$or = [
        { name: regex },
        { description: regex },
        { tags: regex }
      ]
    }
    
    if (category) {
      query.category = category
    }

    // 构建排序条件
    let sort = {}
    sort[sortBy] = sortOrder

    // 获取贴吧列表
    const tiebas = await Tieba.find(query)
      .populate('creator', 'username avatar level')
      .sort(sort)
      .skip(skip)
      .limit(limit)

    // 获取总数
    const total = await Tieba.countDocuments(query)

    res.json({
      success: true,
      data: {
        tiebas,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('获取贴吧列表错误:', error)
    res.status(500).json({
      success: false,
      error: '获取贴吧列表失败'
    })
  }
})

// 获取热门贴吧
router.get('/popular', optionalAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10
    
    const tiebas = await Tieba.getPopular(limit)

    res.json({
      success: true,
      data: { tiebas }
    })
  } catch (error) {
    console.error('获取热门贴吧错误:', error)
    res.status(500).json({
      success: false,
      error: '获取热门贴吧失败'
    })
  }
})

// 创建贴吧
router.post('/', protect, [
  body('name')
    .isLength({ min: 2, max: 20 })
    .withMessage('贴吧名称长度必须在2-20个字符之间')
    .matches(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/)
    .withMessage('贴吧名称只能包含字母、数字、下划线和中文字符'),
  body('description')
    .isLength({ min: 1, max: 500 })
    .withMessage('贴吧描述长度必须在1-500个字符之间'),
  body('category')
    .isIn(['游戏', '动漫', '影视', '音乐', '体育', '科技', '生活', '时尚', '汽车', '教育', '健康', '其他'])
    .withMessage('请选择有效的贴吧分类')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json(validationError(errors))
    }

    const { name, description, category, tags = [] } = req.body

    // 检查贴吧是否已存在
    const existingTieba = await Tieba.findOne({ name })
    if (existingTieba) {
      return res.status(400).json({
        success: false,
        error: '贴吧名称已存在'
      })
    }

    // 创建贴吧
    const tieba = await Tieba.create({
      name,
      description,
      category,
      tags,
      creator: req.user._id,
      moderators: [req.user._id] // 创建者自动成为版主
    })

    res.status(201).json({
      success: true,
      message: '贴吧创建成功',
      data: { tieba }
    })
  } catch (error) {
    console.error('创建贴吧错误:', error)
    res.status(500).json({
      success: false,
      error: '贴吧创建失败'
    })
  }
})

// 获取贴吧详情
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const tieba = await Tieba.findById(req.params.id)
      .populate('creator', 'username avatar level')
      .populate('moderators', 'username avatar level')

    if (!tieba) {
      return res.status(404).json({
        success: false,
        error: '贴吧不存在'
      })
    }

    res.json({
      success: true,
      data: { tieba }
    })
  } catch (error) {
    console.error('获取贴吧详情错误:', error)
    res.status(500).json({
      success: false,
      error: '获取贴吧详情失败'
    })
  }
})

// 更新贴吧信息（需要版主权限）
router.put('/:id', protect, tiebaModerator, [
  body('description').optional().isLength({ max: 500 }).withMessage('贴吧描述最多500个字符'),
  body('announcement.title').optional().isLength({ max: 100 }).withMessage('公告标题最多100个字符'),
  body('announcement.content').optional().isLength({ max: 1000 }).withMessage('公告内容最多1000个字符')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json(validationError(errors))
    }

    const { description, announcement, rules, tags } = req.body

    const updateData = {}
    if (description) updateData.description = description
    if (tags) updateData.tags = tags
    if (announcement) {
      updateData.announcement = {
        title: announcement.title,
        content: announcement.content,
        updatedAt: new Date()
      }
    }
    if (rules) updateData.rules = rules

    const tieba = await Tieba.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('creator', 'username avatar level')
    .populate('moderators', 'username avatar level')

    res.json({
      success: true,
      message: '贴吧信息更新成功',
      data: { tieba }
    })
  } catch (error) {
    console.error('更新贴吧信息错误:', error)
    res.status(500).json({
      success: false,
      error: '贴吧信息更新失败'
    })
  }
})

// 加入贴吧
router.post('/:id/join', protect, async (req, res) => {
  try {
    const tiebaId = req.params.id
    
    const tieba = await Tieba.findById(tiebaId)
    if (!tieba) {
      return res.status(404).json({
        success: false,
        error: '贴吧不存在'
      })
    }

    // 检查加入要求
    if (tieba.joinRequirement === 'invite') {
      return res.status(403).json({
        success: false,
        error: '该贴吧需要邀请才能加入'
      })
    }

    // 检查是否已加入
    const Member = (await import('../models/Member.js')).default
    const existingMember = await Member.findOne({
      user: req.user._id,
      tieba: tiebaId
    })

    if (existingMember) {
      return res.status(400).json({
        success: false,
        error: '您已经是该贴吧成员'
      })
    }

    // 创建成员关系
    await Member.create({
      user: req.user._id,
      tieba: tiebaId,
      role: 'member',
      joinedAt: new Date()
    })

    // 更新贴吧成员数
    await Tieba.findByIdAndUpdate(tiebaId, {
      $inc: { membersCount: 1 }
    })

    res.json({
      success: true,
      message: '加入贴吧成功'
    })
  } catch (error) {
    console.error('加入贴吧错误:', error)
    res.status(500).json({
      success: false,
      error: '加入贴吧失败'
    })
  }
})

// 退出贴吧
router.delete('/:id/leave', protect, async (req, res) => {
  try {
    const tiebaId = req.params.id
    
    const Member = (await import('../models/Member.js')).default
    const member = await Member.findOneAndDelete({
      user: req.user._id,
      tieba: tiebaId
    })

    if (!member) {
      return res.status(400).json({
        success: false,
        error: '您不是该贴吧成员'
      })
    }

    // 更新贴吧成员数
    await Tieba.findByIdAndUpdate(tiebaId, {
      $inc: { membersCount: -1 }
    })

    res.json({
      success: true,
      message: '退出贴吧成功'
    })
  } catch (error) {
    console.error('退出贴吧错误:', error)
    res.status(500).json({
      success: false,
      error: '退出贴吧失败'
    })
  }
})

// 获取贴吧成员列表
router.get('/:id/members', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const role = req.query.role || ''
    const skip = (page - 1) * limit

    const Member = (await import('../models/Member.js')).default
    
    let query = { tieba: req.params.id }
    if (role) {
      query.role = role
    }

    const members = await Member.find(query)
      .populate('user', 'username avatar level bio')
      .sort({ joinedAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await Member.countDocuments(query)

    res.json({
      success: true,
      data: {
        members: members.map(m => ({
          user: m.user,
          role: m.role,
          joinedAt: m.joinedAt
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('获取贴吧成员列表错误:', error)
    res.status(500).json({
      success: false,
      error: '获取贴吧成员列表失败'
    })
  }
})

// 检查是否已加入贴吧
router.get('/:id/is-member', protect, async (req, res) => {
  try {
    const Member = (await import('../models/Member.js')).default
    
    const isMember = await Member.exists({
      user: req.user._id,
      tieba: req.params.id
    })

    res.json({
      success: true,
      data: { isMember: !!isMember }
    })
  } catch (error) {
    console.error('检查贴吧成员状态错误:', error)
    res.status(500).json({
      success: false,
      error: '检查贴吧成员状态失败'
    })
  }
})

// 获取贴吧统计信息
router.get('/:id/stats', optionalAuth, async (req, res) => {
  try {
    const tieba = await Tieba.findById(req.params.id)
      .select('membersCount postsCount todayPostsCount popularity statistics')

    if (!tieba) {
      return res.status(404).json({
        success: false,
        error: '贴吧不存在'
      })
    }

    // 获取贴吧帖子统计（按时间分组）
    const Post = (await import('../models/Post.js')).default
    const postStats = await Post.aggregate([
      { $match: { tieba: tieba._id, isDeleted: false } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } }
    ])

    res.json({
      success: true,
      data: {
        basicStats: {
          membersCount: tieba.membersCount,
          postsCount: tieba.postsCount,
          todayPostsCount: tieba.todayPostsCount,
          popularity: tieba.popularity
        },
        viewStats: tieba.statistics,
        postStats
      }
    })
  } catch (error) {
    console.error('获取贴吧统计错误:', error)
    res.status(500).json({
      success: false,
      error: '获取贴吧统计失败'
    })
  }
})

export default router