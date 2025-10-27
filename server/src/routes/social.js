import express from 'express'
import { body, query, validationResult } from 'express-validator'
import { protect, optionalAuth } from '../middleware/authMiddleware.js'
import socialShareService from '../services/socialShareService.js'

const router = express.Router()

// 生成分享链接
router.post('/generate-link',
  [
    body('platform').isIn(['weibo', 'qq', 'wechat', 'douban', 'qzone']).withMessage('平台必须是weibo、qq、wechat、douban或qzone'),
    body('title').trim().isLength({ min: 1, max: 100 }).withMessage('标题长度必须在1-100字符之间'),
    body('url').isURL().withMessage('URL格式不正确'),
    body('description').optional().trim().isLength({ max: 200 }).withMessage('描述长度不能超过200字符'),
    body('image').optional().isURL().withMessage('图片URL格式不正确'),
    body('tags').optional().isArray().withMessage('标签必须是数组'),
    body('tags.*').optional().trim().isLength({ max: 20 }).withMessage('每个标签长度不能超过20字符')
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

      const { platform, title, url, description, image, tags = [] } = req.body
      const userId = req.user ? req.user.id : null
      
      const shareLink = await socialShareService.generateShareLink({
        platform,
        title,
        url,
        description,
        image,
        tags,
        userId
      })
      
      res.json({
        success: true,
        data: {
          platform,
          shareLink,
          qrCode: await socialShareService.generateQRCode(shareLink),
          timestamp: new Date().toISOString()
        }
      })

    } catch (error) {
      console.error('生成分享链接失败:', error)
      res.status(500).json({
        success: false,
        message: '生成分享链接失败'
      })
    }
  }
)

// 批量生成分享链接
router.post('/batch-generate-links',
  [
    body('items').isArray({ min: 1, max: 10 }).withMessage('分享项必须是包含1-10个对象的数组'),
    body('items.*.platform').isIn(['weibo', 'qq', 'wechat', 'douban', 'qzone']).withMessage('平台必须是weibo、qq、wechat、douban或qzone'),
    body('items.*.title').trim().isLength({ min: 1, max: 100 }).withMessage('标题长度必须在1-100字符之间'),
    body('items.*.url').isURL().withMessage('URL格式不正确'),
    body('items.*.description').optional().trim().isLength({ max: 200 }).withMessage('描述长度不能超过200字符')
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

      const { items } = req.body
      const userId = req.user ? req.user.id : null
      const results = []
      
      for (const item of items) {
        try {
          const shareLink = await socialShareService.generateShareLink({
            ...item,
            userId
          })
          
          results.push({
            platform: item.platform,
            success: true,
            data: {
              shareLink,
              qrCode: await socialShareService.generateQRCode(shareLink)
            }
          })
        } catch (error) {
          results.push({
            platform: item.platform,
            success: false,
            error: error.message
          })
        }
      }
      
      res.json({
        success: true,
        data: {
          results,
          total: items.length,
          successful: results.filter(r => r.success).length
        }
      })

    } catch (error) {
      console.error('批量生成分享链接失败:', error)
      res.status(500).json({
        success: false,
        message: '批量生成分享链接失败'
      })
    }
  }
)

// 获取分享统计
router.get('/stats',
  [
    query('url').optional().isURL().withMessage('URL格式不正确'),
    query('platform').optional().isIn(['weibo', 'qq', 'wechat', 'douban', 'qzone', 'all']).withMessage('平台必须是weibo、qq、wechat、douban、qzone或all'),
    query('startDate').optional().isISO8601().withMessage('开始日期格式不正确'),
    query('endDate').optional().isISO8601().withMessage('结束日期格式不正确'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('限制数量必须在1-100之间')
  ],
  protect,
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

      const { url, platform = 'all', startDate, endDate, limit = 50 } = req.query
      const userId = req.user.id
      
      const stats = await socialShareService.getShareStats({
        url,
        platform: platform === 'all' ? undefined : platform,
        userId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit: parseInt(limit)
      })
      
      res.json({
        success: true,
        data: stats
      })

    } catch (error) {
      console.error('获取分享统计失败:', error)
      res.status(500).json({
        success: false,
        message: '获取分享统计失败'
      })
    }
  }
)

// 记录分享行为
router.post('/record',
  [
    body('platform').isIn(['weibo', 'qq', 'wechat', 'douban', 'qzone']).withMessage('平台必须是weibo、qq、wechat、douban或qzone'),
    body('url').isURL().withMessage('URL格式不正确'),
    body('title').trim().isLength({ min: 1, max: 100 }).withMessage('标题长度必须在1-100字符之间'),
    body('type').optional().isIn(['post', 'tieba', 'user', 'other']).withMessage('分享类型必须是post、tieba、user或other')
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

      const { platform, url, title, type = 'other' } = req.body
      const userId = req.user ? req.user.id : null
      const userAgent = req.get('User-Agent') || ''
      const ip = req.ip || req.connection.remoteAddress
      
      await socialShareService.recordShare({
        platform,
        url,
        title,
        type,
        userId,
        userAgent,
        ip
      })
      
      res.json({
        success: true,
        message: '分享记录已保存'
      })

    } catch (error) {
      console.error('记录分享失败:', error)
      res.status(500).json({
        success: false,
        message: '记录分享失败'
      })
    }
  }
)

// 获取热门分享内容
router.get('/popular',
  [
    query('type').optional().isIn(['post', 'tieba', 'user', 'all']).withMessage('类型必须是post、tieba、user或all'),
    query('platform').optional().isIn(['weibo', 'qq', 'wechat', 'douban', 'qzone', 'all']).withMessage('平台必须是weibo、qq、wechat、douban、qzone或all'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('限制数量必须在1-50之间'),
    query('days').optional().isInt({ min: 1, max: 365 }).withMessage('天数必须在1-365之间')
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

      const { type = 'all', platform = 'all', limit = 20, days = 7 } = req.query
      
      const popularShares = await socialShareService.getPopularShares({
        type: type === 'all' ? undefined : type,
        platform: platform === 'all' ? undefined : platform,
        limit: parseInt(limit),
        days: parseInt(days)
      })
      
      res.json({
        success: true,
        data: popularShares
      })

    } catch (error) {
      console.error('获取热门分享失败:', error)
      res.status(500).json({
        success: false,
        message: '获取热门分享失败'
      })
    }
  }
)

// 生成二维码
router.get('/qrcode',
  [
    query('url').isURL().withMessage('URL格式不正确'),
    query('size').optional().isInt({ min: 100, max: 1000 }).withMessage('尺寸必须在100-1000像素之间'),
    query('margin').optional().isInt({ min: 0, max: 10 }).withMessage('边距必须在0-10之间')
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

      const { url, size = 200, margin = 1 } = req.query
      const qrCode = await socialShareService.generateQRCode(url, parseInt(size), parseInt(margin))
      
      res.json({
        success: true,
        data: {
          url,
          qrCode,
          size: parseInt(size),
          margin: parseInt(margin)
        }
      })

    } catch (error) {
      console.error('生成二维码失败:', error)
      res.status(500).json({
        success: false,
        message: '生成二维码失败'
      })
    }
  }
)

// 获取分享平台配置
router.get('/platforms', optionalAuth, async (req, res) => {
  try {
    const platforms = socialShareService.getSupportedPlatforms()
    
    res.json({
      success: true,
      data: platforms
    })

  } catch (error) {
    console.error('获取分享平台配置失败:', error)
    res.status(500).json({
      success: false,
      message: '获取分享平台配置失败'
    })
  }
})

// 测试分享服务
router.get('/test', protect, async (req, res) => {
  try {
    const testResult = await socialShareService.testServices()
    
    res.json({
      success: true,
      data: testResult
    })

  } catch (error) {
    console.error('测试分享服务失败:', error)
    res.status(500).json({
      success: false,
      message: '测试分享服务失败'
    })
  }
})

// 获取用户分享历史
router.get('/history',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('限制数量必须在1-100之间'),
    query('offset').optional().isInt({ min: 0 }).withMessage('偏移量必须大于等于0')
  ],
  protect,
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

      const { limit = 20, offset = 0 } = req.query
      const userId = req.user.id
      
      const history = await socialShareService.getUserShareHistory(userId, parseInt(limit), parseInt(offset))
      
      res.json({
        success: true,
        data: history
      })

    } catch (error) {
      console.error('获取用户分享历史失败:', error)
      res.status(500).json({
        success: false,
        message: '获取用户分享历史失败'
      })
    }
  }
)

export default router