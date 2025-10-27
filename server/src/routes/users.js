import express from 'express'
import { body, validationResult } from 'express-validator'
import User from '../models/User.js'
import { protect, optionalAuth } from '../middleware/authMiddleware.js'
import { validationError } from '../middleware/errorMiddleware.js'

const router = express.Router()

// 获取用户列表（支持搜索和分页）
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const search = req.query.search || ''
    const sortBy = req.query.sortBy || 'createdAt'
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1

    const skip = (page - 1) * limit
    
    // 构建查询条件
    let query = { isBanned: false }
    
    if (search) {
      const regex = new RegExp(search, 'i')
      query.$or = [
        { username: regex },
        { bio: regex }
      ]
    }

    // 构建排序条件
    let sort = {}
    sort[sortBy] = sortOrder

    // 获取用户列表
    const users = await User.find(query)
      .select('username avatar bio level experience followersCount postsCount createdAt')
      .sort(sort)
      .skip(skip)
      .limit(limit)

    // 获取总数
    const total = await User.countDocuments(query)

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('获取用户列表错误:', error)
    res.status(500).json({
      success: false,
      error: '获取用户列表失败'
    })
  }
})

// 获取用户详情
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -email')
      .populate('followers', 'username avatar level')
      .populate('following', 'username avatar level')

    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      })
    }

    if (user.isBanned) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      })
    }

    res.json({
      success: true,
      data: { user }
    })
  } catch (error) {
    console.error('获取用户详情错误:', error)
    res.status(500).json({
      success: false,
      error: '获取用户详情失败'
    })
  }
})

// 关注用户
router.post('/:id/follow', protect, async (req, res) => {
  try {
    const targetUserId = req.params.id
    
    // 不能关注自己
    if (targetUserId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        error: '不能关注自己'
      })
    }

    const targetUser = await User.findById(targetUserId)
    
    if (!targetUser || targetUser.isBanned) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      })
    }

    // 检查是否已关注
    const Follow = (await import('../models/Follow.js')).default
    const existingFollow = await Follow.findOne({
      follower: req.user._id,
      following: targetUserId
    })

    if (existingFollow) {
      return res.status(400).json({
        success: false,
        error: '已关注该用户'
      })
    }

    // 创建关注关系
    await Follow.create({
      follower: req.user._id,
      following: targetUserId
    })

    // 更新关注数和粉丝数
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { followingCount: 1 }
    })

    await User.findByIdAndUpdate(targetUserId, {
      $inc: { followersCount: 1 }
    })

    res.json({
      success: true,
      message: '关注成功'
    })
  } catch (error) {
    console.error('关注用户错误:', error)
    res.status(500).json({
      success: false,
      error: '关注失败'
    })
  }
})

// 取消关注
router.delete('/:id/follow', protect, async (req, res) => {
  try {
    const targetUserId = req.params.id
    
    const Follow = (await import('../models/Follow.js')).default
    const follow = await Follow.findOneAndDelete({
      follower: req.user._id,
      following: targetUserId
    })

    if (!follow) {
      return res.status(400).json({
        success: false,
        error: '未关注该用户'
      })
    }

    // 更新关注数和粉丝数
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { followingCount: -1 }
    })

    await User.findByIdAndUpdate(targetUserId, {
      $inc: { followersCount: -1 }
    })

    res.json({
      success: true,
      message: '取消关注成功'
    })
  } catch (error) {
    console.error('取消关注错误:', error)
    res.status(500).json({
      success: false,
      error: '取消关注失败'
    })
  }
})

// 获取用户的粉丝列表
router.get('/:id/followers', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit

    const Follow = (await import('../models/Follow.js')).default
    
    const followers = await Follow.find({ following: req.params.id })
      .populate('follower', 'username avatar level bio followersCount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await Follow.countDocuments({ following: req.params.id })

    res.json({
      success: true,
      data: {
        followers: followers.map(f => f.follower),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('获取粉丝列表错误:', error)
    res.status(500).json({
      success: false,
      error: '获取粉丝列表失败'
    })
  }
})

// 获取用户的关注列表
router.get('/:id/following', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const skip = (page - 1) * limit

    const Follow = (await import('../models/Follow.js')).default
    
    const following = await Follow.find({ follower: req.params.id })
      .populate('following', 'username avatar level bio followersCount')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await Follow.countDocuments({ follower: req.params.id })

    res.json({
      success: true,
      data: {
        following: following.map(f => f.following),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('获取关注列表错误:', error)
    res.status(500).json({
      success: false,
      error: '获取关注列表失败'
    })
  }
})

// 检查是否已关注
router.get('/:id/is-following', protect, async (req, res) => {
  try {
    const Follow = (await import('../models/Follow.js')).default
    
    const isFollowing = await Follow.exists({
      follower: req.user._id,
      following: req.params.id
    })

    res.json({
      success: true,
      data: { isFollowing: !!isFollowing }
    })
  } catch (error) {
    console.error('检查关注状态错误:', error)
    res.status(500).json({
      success: false,
      error: '检查关注状态失败'
    })
  }
})

// 获取用户统计信息
router.get('/:id/stats', optionalAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('postsCount commentsCount followersCount followingCount level experience')

    if (!user || user.isBanned) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      })
    }

    // 获取用户的帖子统计（按时间分组）
    const Post = (await import('../models/Post.js')).default
    const postStats = await Post.aggregate([
      { $match: { author: user._id, isDeleted: false } },
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
          postsCount: user.postsCount,
          commentsCount: user.commentsCount,
          followersCount: user.followersCount,
          followingCount: user.followingCount,
          level: user.level,
          experience: user.experience
        },
        postStats
      }
    })
  } catch (error) {
    console.error('获取用户统计错误:', error)
    res.status(500).json({
      success: false,
      error: '获取用户统计失败'
    })
  }
})

// 更新用户头像
router.put('/avatar', protect, async (req, res) => {
  try {
    const { avatarUrl } = req.body

    if (!avatarUrl) {
      return res.status(400).json({
        success: false,
        error: '请提供头像URL'
      })
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: avatarUrl },
      { new: true }
    ).select('-password')

    res.json({
      success: true,
      message: '头像更新成功',
      data: { user }
    })
  } catch (error) {
    console.error('更新头像错误:', error)
    res.status(500).json({
      success: false,
      error: '头像更新失败'
    })
  }
})

export default router