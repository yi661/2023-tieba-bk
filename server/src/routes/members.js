import express from 'express'
import { body, validationResult } from 'express-validator'
import Member from '../models/Member.js'
import Tieba from '../models/Tieba.js'
import { protect, admin, tiebaModerator } from '../middleware/authMiddleware.js'
import { validationError } from '../middleware/errorMiddleware.js'

const router = express.Router()

// 获取贴吧成员列表
router.get('/tieba/:tiebaId', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const role = req.query.role || 'all'

    const result = await Member.getTiebaMembers(req.params.tiebaId, page, limit, role)

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('获取贴吧成员列表错误:', error)
    res.status(500).json({
      success: false,
      error: '获取贴吧成员列表失败'
    })
  }
})

// 获取用户的贴吧列表
router.get('/user/:userId', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20

    const result = await Member.getUserTiebas(req.params.userId, page, limit)

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('获取用户贴吧列表错误:', error)
    res.status(500).json({
      success: false,
      error: '获取用户贴吧列表失败'
    })
  }
})

// 获取我的贴吧列表（当前用户）
router.get('/my-tiebas', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20

    const result = await Member.getUserTiebas(req.user._id, page, limit)

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('获取我的贴吧列表错误:', error)
    res.status(500).json({
      success: false,
      error: '获取我的贴吧列表失败'
    })
  }
})

// 加入贴吧
router.post('/join', protect, [
  body('tiebaId')
    .notEmpty()
    .withMessage('请选择要加入的贴吧')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json(validationError(errors))
    }

    const { tiebaId } = req.body

    // 检查贴吧是否存在
    const tieba = await Tieba.findById(tiebaId)
    if (!tieba) {
      return res.status(404).json({
        success: false,
        error: '贴吧不存在'
      })
    }

    // 检查是否已加入
    const existingMember = await Member.findOne({
      user: req.user._id,
      tieba: tiebaId
    })

    if (existingMember) {
      if (existingMember.isBanned) {
        return res.status(403).json({
          success: false,
          error: '您已被禁止加入此贴吧'
        })
      }
      return res.status(400).json({
        success: false,
        error: '您已经加入此贴吧'
      })
    }

    // 检查贴吧加入要求
    if (tieba.joinRequirement === 'approval') {
      return res.status(403).json({
        success: false,
        error: '此贴吧需要申请才能加入，请等待审核'
      })
    }

    // 创建成员记录
    const member = await Member.create({
      user: req.user._id,
      tieba: tiebaId,
      role: 'member'
    })

    // 更新贴吧成员数
    tieba.memberCount += 1
    await tieba.save()

    res.status(201).json({
      success: true,
      message: '加入贴吧成功',
      data: { member }
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
router.delete('/leave/:tiebaId', protect, async (req, res) => {
  try {
    const { tiebaId } = req.params

    const member = await Member.findOne({
      user: req.user._id,
      tieba: tiebaId
    })

    if (!member) {
      return res.status(400).json({
        success: false,
        error: '您还未加入此贴吧'
      })
    }

    // 检查是否是创建者
    if (member.role === 'creator') {
      return res.status(403).json({
        success: false,
        error: '贴吧创建者不能退出贴吧'
      })
    }

    // 删除成员记录
    await Member.findByIdAndDelete(member._id)

    // 更新贴吧成员数
    await Tieba.findByIdAndUpdate(tiebaId, {
      $inc: { memberCount: -1 }
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

// 检查是否已加入贴吧
router.get('/check/:tiebaId', protect, async (req, res) => {
  try {
    const { tiebaId } = req.params

    const result = await Member.isMember(req.user._id, tiebaId)

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('检查成员状态错误:', error)
    res.status(500).json({
      success: false,
      error: '检查成员状态失败'
    })
  }
})

// 批量检查成员状态
router.post('/batch-check', protect, async (req, res) => {
  try {
    const { tiebaIds } = req.body

    if (!tiebaIds || !Array.isArray(tiebaIds)) {
      return res.status(400).json({
        success: false,
        error: '参数错误：tiebaIds必须为数组'
      })
    }

    const membershipMap = await Member.batchCheckMembership(req.user._id, tiebaIds)

    res.json({
      success: true,
      data: { membershipMap }
    })
  } catch (error) {
    console.error('批量检查成员状态错误:', error)
    res.status(500).json({
      success: false,
      error: '批量检查成员状态失败'
    })
  }
})

// 获取贴吧成员统计
router.get('/stats/:tiebaId', async (req, res) => {
  try {
    const { tiebaId } = req.params

    const stats = await Member.getTiebaStats(tiebaId)

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('获取贴吧成员统计错误:', error)
    res.status(500).json({
      success: false,
      error: '获取贴吧成员统计失败'
    })
  }
})

// 获取活跃成员
router.get('/active/:tiebaId', async (req, res) => {
  try {
    const { tiebaId } = req.params
    const days = parseInt(req.query.days) || 7
    const limit = parseInt(req.query.limit) || 10

    const members = await Member.getActiveMembers(tiebaId, days, limit)

    res.json({
      success: true,
      data: { members }
    })
  } catch (error) {
    console.error('获取活跃成员错误:', error)
    res.status(500).json({
      success: false,
      error: '获取活跃成员失败'
    })
  }
})

// 封禁成员（需要版主权限）
router.post('/:memberId/ban', protect, tiebaModerator, [
  body('reason')
    .isLength({ min: 1, max: 500 })
    .withMessage('封禁原因长度必须在1-500个字符之间'),
  body('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('封禁天数必须是1-365之间的整数')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json(validationError(errors))
    }

    const { memberId } = req.params
    const { reason, days = 7 } = req.body

    const member = await Member.findById(memberId)
    if (!member) {
      return res.status(404).json({
        success: false,
        error: '成员不存在'
      })
    }

    // 检查权限：不能封禁版主或创建者
    if (member.role === 'moderator' || member.role === 'creator') {
      return res.status(403).json({
        success: false,
        error: '无权封禁版主或创建者'
      })
    }

    const banUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    await member.banMember(reason, banUntil)

    res.json({
      success: true,
      message: `成员已被封禁 ${days} 天`
    })
  } catch (error) {
    console.error('封禁成员错误:', error)
    res.status(500).json({
      success: false,
      error: '封禁成员失败'
    })
  }
})

// 解封成员（需要版主权限）
router.post('/:memberId/unban', protect, tiebaModerator, async (req, res) => {
  try {
    const { memberId } = req.params

    const member = await Member.findById(memberId)
    if (!member) {
      return res.status(404).json({
        success: false,
        error: '成员不存在'
      })
    }

    if (!member.isBanned) {
      return res.status(400).json({
        success: false,
        error: '该成员未被封禁'
      })
    }

    await member.unbanMember()

    res.json({
      success: true,
      message: '成员已解封'
    })
  } catch (error) {
    console.error('解封成员错误:', error)
    res.status(500).json({
      success: false,
      error: '解封成员失败'
    })
  }
})

// 设置成员角色（需要版主权限）
router.put('/:memberId/role', protect, tiebaModerator, [
  body('role')
    .isIn(['member', 'moderator'])
    .withMessage('角色必须是member或moderator')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json(validationError(errors))
    }

    const { memberId } = req.params
    const { role } = req.body

    const member = await Member.findById(memberId)
    if (!member) {
      return res.status(404).json({
        success: false,
        error: '成员不存在'
      })
    }

    // 不能修改创建者角色
    if (member.role === 'creator') {
      return res.status(403).json({
        success: false,
        error: '不能修改创建者角色'
      })
    }

    await member.setRole(role)

    res.json({
      success: true,
      message: `成员角色已设置为 ${role}`
    })
  } catch (error) {
    console.error('设置成员角色错误:', error)
    res.status(500).json({
      success: false,
      error: '设置成员角色失败'
    })
  }
})

export default router