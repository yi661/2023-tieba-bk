import jwt from 'jsonwebtoken'
import User from '../models/User.js'

// 验证JWT令牌
const protect = async (req, res, next) => {
  let token

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // 从Bearer token中获取令牌
      token = req.headers.authorization.split(' ')[1]

      // 验证令牌
      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      // 获取用户信息（排除密码字段）
      req.user = await User.findById(decoded.userId).select('-password')

      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: '用户不存在或已被删除'
        })
      }

      if (req.user.isBanned) {
        return res.status(403).json({
          success: false,
          error: '您的账号已被封禁'
        })
      }

      next()
    } catch (error) {
      console.error('令牌验证错误:', error)
      return res.status(401).json({
        success: false,
        error: '令牌无效，请重新登录'
      })
    }
  } else {
    return res.status(401).json({
      success: false,
      error: '未提供认证令牌'
    })
  }
}

// 可选认证（不强制要求登录）
const optionalAuth = async (req, res, next) => {
  let token

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1]
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      req.user = await User.findById(decoded.userId).select('-password')
    } catch (error) {
      // 令牌无效，但不阻止请求继续
      console.log('可选认证失败:', error.message)
    }
  }

  next()
}

// 验证管理员权限
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next()
  } else {
    return res.status(403).json({
      success: false,
      error: '需要管理员权限'
    })
  }
}

// 验证版主权限
const moderator = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'moderator')) {
    next()
  } else {
    return res.status(403).json({
      success: false,
      error: '需要版主权限'
    })
  }
}

// 验证资源所有权
const authorize = (resourceOwnerField = 'author') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id
      const Model = req.model // 需要在路由中设置
      
      if (!Model) {
        return res.status(500).json({
          success: false,
          error: '服务器配置错误'
        })
      }

      const resource = await Model.findById(resourceId)
      
      if (!resource) {
        return res.status(404).json({
          success: false,
          error: '资源未找到'
        })
      }

      // 检查用户是否是资源所有者或管理员
      const isOwner = resource[resourceOwnerField].toString() === req.user._id.toString()
      const isAdmin = req.user.role === 'admin'
      
      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: '无权操作此资源'
        })
      }

      req.resource = resource
      next()
    } catch (error) {
      console.error('授权检查错误:', error)
      return res.status(500).json({
        success: false,
        error: '授权检查失败'
      })
    }
  }
}

// 验证贴吧版主权限
const tiebaModerator = async (req, res, next) => {
  try {
    const { tiebaId } = req.params
    const Tieba = (await import('../models/Tieba.js')).default
    
    const tieba = await Tieba.findById(tiebaId)
    
    if (!tieba) {
      return res.status(404).json({
        success: false,
        error: '贴吧未找到'
      })
    }

    // 检查用户是否是贴吧版主或管理员
    const isModerator = tieba.moderators.some(mod => 
      mod.toString() === req.user._id.toString()
    )
    const isCreator = tieba.creator.toString() === req.user._id.toString()
    const isAdmin = req.user.role === 'admin'
    
    if (!isModerator && !isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: '需要贴吧版主权限'
      })
    }

    req.tieba = tieba
    next()
  } catch (error) {
    console.error('贴吧版主权限检查错误:', error)
    return res.status(500).json({
      success: false,
      error: '权限检查失败'
    })
  }
}

// 验证用户是否已登录（重定向到登录页）
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: '请先登录',
      redirect: '/login'
    })
  }
  next()
}

// 验证用户是否未登录（已登录用户不能访问）
const guest = (req, res, next) => {
  if (req.user) {
    return res.status(403).json({
      success: false,
      error: '已登录用户无法访问此页面',
      redirect: '/'
    })
  }
  next()
}

export {
  protect,
  optionalAuth,
  admin,
  moderator,
  authorize,
  tiebaModerator,
  requireAuth,
  guest
}