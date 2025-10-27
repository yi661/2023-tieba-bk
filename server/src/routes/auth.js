import express from 'express'
import { body, validationResult } from 'express-validator'
import User from '../models/User.js'
import { protect, guest } from '../middleware/authMiddleware.js'
import { validationError } from '../middleware/errorMiddleware.js'

const router = express.Router()

// 用户注册
router.post('/register', [
  body('username')
    .isLength({ min: 3, max: 20 })
    .withMessage('用户名长度必须在3-20个字符之间')
    .matches(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/)
    .withMessage('用户名只能包含字母、数字、下划线和中文字符'),
  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码至少6个字符')
], guest, async (req, res) => {
  try {
    // 检查验证错误
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json(validationError(errors))
    }

    const { username, email, password } = req.body

    // 检查用户是否已存在
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    })

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: existingUser.email === email ? '邮箱已被注册' : '用户名已被使用'
      })
    }

    // 创建新用户
    const user = await User.create({
      username,
      email,
      password
    })

    // 生成JWT令牌
    const token = user.generateAuthToken()

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          level: user.level,
          experience: user.experience
        },
        token
      }
    })
  } catch (error) {
    console.error('注册错误:', error)
    res.status(500).json({
      success: false,
      error: '注册失败，请稍后重试'
    })
  }
})

// 用户登录
router.post('/login', [
  body('identifier')
    .notEmpty()
    .withMessage('请输入用户名或邮箱'),
  body('password')
    .notEmpty()
    .withMessage('请输入密码')
], guest, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json(validationError(errors))
    }

    const { identifier, password } = req.body

    // 查找用户（支持用户名或邮箱登录）
    const user = await User.findByUsernameOrEmail(identifier)
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: '用户名或密码错误'
      })
    }

    // 检查账号状态
    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        error: '您的账号已被封禁'
      })
    }

    // 验证密码
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: '用户名或密码错误'
      })
    }

    // 更新最后登录时间
    await user.updateLastLogin()

    // 生成JWT令牌
    const token = user.generateAuthToken()

    res.json({
      success: true,
      message: '登录成功',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          level: user.level,
          experience: user.experience,
          lastLogin: user.lastLogin
        },
        token
      }
    })
  } catch (error) {
    console.error('登录错误:', error)
    res.status(500).json({
      success: false,
      error: '登录失败，请稍后重试'
    })
  }
})

// 获取当前用户信息
router.get('/me', protect, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: {
          id: req.user._id,
          username: req.user.username,
          email: req.user.email,
          avatar: req.user.avatar,
          bio: req.user.bio,
          gender: req.user.gender,
          birthday: req.user.birthday,
          location: req.user.location,
          level: req.user.level,
          experience: req.user.experience,
          followersCount: req.user.followersCount,
          followingCount: req.user.followingCount,
          postsCount: req.user.postsCount,
          commentsCount: req.user.commentsCount,
          isVerified: req.user.isVerified,
          lastLogin: req.user.lastLogin,
          preferences: req.user.preferences,
          socialLinks: req.user.socialLinks,
          createdAt: req.user.createdAt
        }
      }
    })
  } catch (error) {
    console.error('获取用户信息错误:', error)
    res.status(500).json({
      success: false,
      error: '获取用户信息失败'
    })
  }
})

// 更新用户信息
router.put('/profile', protect, [
  body('bio').optional().isLength({ max: 200 }).withMessage('个人简介最多200个字符'),
  body('gender').optional().isIn(['male', 'female', 'unknown']).withMessage('性别选择无效'),
  body('location').optional().isLength({ max: 50 }).withMessage('地区最多50个字符')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json(validationError(errors))
    }

    const { bio, gender, location, birthday } = req.body

    // 更新用户信息
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          bio,
          gender,
          location,
          birthday: birthday ? new Date(birthday) : undefined
        }
      },
      { new: true, runValidators: true }
    ).select('-password')

    res.json({
      success: true,
      message: '个人信息更新成功',
      data: { user: updatedUser }
    })
  } catch (error) {
    console.error('更新用户信息错误:', error)
    res.status(500).json({
      success: false,
      error: '更新失败，请稍后重试'
    })
  }
})

// 修改密码
router.put('/password', protect, [
  body('currentPassword').notEmpty().withMessage('请输入当前密码'),
  body('newPassword').isLength({ min: 6 }).withMessage('新密码至少6个字符')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json(validationError(errors))
    }

    const { currentPassword, newPassword } = req.body
    const user = await User.findById(req.user._id).select('+password')

    // 验证当前密码
    const isCurrentPasswordValid = await user.comparePassword(currentPassword)
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: '当前密码错误'
      })
    }

    // 更新密码
    user.password = newPassword
    await user.save()

    res.json({
      success: true,
      message: '密码修改成功'
    })
  } catch (error) {
    console.error('修改密码错误:', error)
    res.status(500).json({
      success: false,
      error: '修改失败，请稍后重试'
    })
  }
})

// 刷新令牌
router.post('/refresh', protect, async (req, res) => {
  try {
    const token = req.user.generateAuthToken()
    
    res.json({
      success: true,
      data: { token }
    })
  } catch (error) {
    console.error('刷新令牌错误:', error)
    res.status(500).json({
      success: false,
      error: '令牌刷新失败'
    })
  }
})

// 用户登出
router.post('/logout', protect, async (req, res) => {
  try {
    // 在实际应用中，这里可以添加令牌黑名单逻辑
    res.json({
      success: true,
      message: '登出成功'
    })
  } catch (error) {
    console.error('登出错误:', error)
    res.status(500).json({
      success: false,
      error: '登出失败'
    })
  }
})

// 忘记密码（发送重置邮件）
router.post('/forgot-password', [
  body('email').isEmail().withMessage('请输入有效的邮箱地址')
], guest, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json(validationError(errors))
    }

    const { email } = req.body
    const user = await User.findOne({ email })

    if (!user) {
      // 出于安全考虑，即使邮箱不存在也返回成功
      return res.json({
        success: true,
        message: '如果邮箱存在，重置链接将发送到您的邮箱'
      })
    }

    // 在实际应用中，这里应该生成重置令牌并发送邮件
    // const resetToken = user.generateResetToken()
    // await sendResetEmail(user.email, resetToken)

    res.json({
      success: true,
      message: '如果邮箱存在，重置链接将发送到您的邮箱'
    })
  } catch (error) {
    console.error('忘记密码错误:', error)
    res.status(500).json({
      success: false,
      error: '发送重置邮件失败'
    })
  }
})

export default router