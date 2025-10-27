import express from 'express'
import { body, query, validationResult } from 'express-validator'
import { protect } from '../middleware/authMiddleware.js'
import notificationService from '../services/notificationService.js'

const router = express.Router()

// 获取用户通知设置
router.get('/settings', protect, async (req, res) => {
  try {
    const settings = await notificationService.getUserNotificationSettings(req.user.id)
    
    res.json({
      success: true,
      data: settings
    })

  } catch (error) {
    console.error('获取通知设置失败:', error)
    res.status(500).json({
      success: false,
      message: '获取通知设置失败'
    })
  }
})

// 更新用户通知设置
router.put('/settings',
  [
    body('system').optional().isBoolean().withMessage('系统通知设置必须是布尔值'),
    body('tieba').optional().isBoolean().withMessage('贴吧通知设置必须是布尔值'),
    body('privateMessage').optional().isBoolean().withMessage('私信通知设置必须是布尔值'),
    body('like').optional().isBoolean().withMessage('点赞通知设置必须是布尔值'),
    body('comment').optional().isBoolean().withMessage('评论通知设置必须是布尔值'),
    body('follow').optional().isBoolean().withMessage('关注通知设置必须是布尔值'),
    body('email').optional().isBoolean().withMessage('邮件通知设置必须是布尔值'),
    body('push').optional().isBoolean().withMessage('推送通知设置必须是布尔值')
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

      const result = await notificationService.updateUserNotificationSettings(req.user.id, req.body)
      
      if (result.success) {
        res.json({
          success: true,
          message: '通知设置更新成功',
          data: result.settings
        })
      } else {
        res.status(400).json({
          success: false,
          message: result.error
        })
      }

    } catch (error) {
      console.error('更新通知设置失败:', error)
      res.status(500).json({
        success: false,
        message: '更新通知设置失败'
      })
    }
  }
)

// 获取未读通知数量
router.get('/unread-count', protect, async (req, res) => {
  try {
    const counts = await notificationService.getUnreadNotificationCount(req.user.id)
    
    res.json({
      success: true,
      data: counts
    })

  } catch (error) {
    console.error('获取未读通知数量失败:', error)
    res.status(500).json({
      success: false,
      message: '获取未读通知数量失败'
    })
  }
})

// 标记通知为已读
router.post('/mark-read',
  [
    body('notificationIds').isArray().withMessage('通知ID列表必须是数组'),
    body('notificationIds.*').isMongoId().withMessage('通知ID格式不正确')
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

      const { notificationIds } = req.body
      const result = await notificationService.markNotificationsAsRead(req.user.id, notificationIds)
      
      if (result.success) {
        res.json({
          success: true,
          message: '通知标记为已读成功',
          data: {
            markedCount: result.markedCount
          }
        })
      } else {
        res.status(400).json({
          success: false,
          message: result.error
        })
      }

    } catch (error) {
      console.error('标记通知为已读失败:', error)
      res.status(500).json({
        success: false,
        message: '标记通知为已读失败'
      })
    }
  }
)

// 清除所有通知
router.delete('/clear-all', protect, async (req, res) => {
  try {
    const result = await notificationService.clearAllNotifications(req.user.id)
    
    if (result.success) {
      res.json({
        success: true,
        message: '所有通知已清除'
      })
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      })
    }

  } catch (error) {
    console.error('清除通知失败:', error)
    res.status(500).json({
      success: false,
      message: '清除通知失败'
    })
  }
})

// 发送测试通知
router.post('/test', protect, async (req, res) => {
  try {
    const result = await notificationService.sendSystemNotification(
      req.user.id,
      '测试通知',
      '这是一个测试通知消息',
      { type: 'test', timestamp: new Date().toISOString() }
    )
    
    if (result.success) {
      res.json({
        success: true,
        message: '测试通知发送成功'
      })
    } else {
      res.status(400).json({
        success: false,
        message: result.error
      })
    }

  } catch (error) {
    console.error('发送测试通知失败:', error)
    res.status(500).json({
      success: false,
      message: '发送测试通知失败'
    })
  }
})

// 获取通知服务状态
router.get('/status', protect, async (req, res) => {
  try {
    const status = notificationService.getServiceStatus()
    
    res.json({
      success: true,
      data: status
    })

  } catch (error) {
    console.error('获取通知服务状态失败:', error)
    res.status(500).json({
      success: false,
      message: '获取通知服务状态失败'
    })
  }
})

export default router