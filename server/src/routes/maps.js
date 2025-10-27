import express from 'express'
import { body, query, validationResult } from 'express-validator'
import { protect, optionalAuth } from '../middleware/authMiddleware.js'
import mapService from '../services/mapService.js'

const router = express.Router()

// 地址转坐标（地理编码）
router.get('/geocode',
  [
    query('address').trim().isLength({ min: 1, max: 200 }).withMessage('地址长度必须在1-200字符之间'),
    query('provider').optional().isIn(['baidu', 'google']).withMessage('服务提供商必须是baidu或google')
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

      const { address, provider = 'baidu' } = req.query
      const result = await mapService.geocode(address, provider)
      
      if (result) {
        res.json({
          success: true,
          data: result
        })
      } else {
        res.status(400).json({
          success: false,
          message: '地理编码失败'
        })
      }

    } catch (error) {
      console.error('地理编码失败:', error)
      res.status(500).json({
        success: false,
        message: '地理编码服务暂时不可用'
      })
    }
  }
)

// 坐标转地址（逆地理编码）
router.get('/reverse-geocode',
  [
    query('lat').isFloat({ min: -90, max: 90 }).withMessage('纬度必须在-90到90之间'),
    query('lng').isFloat({ min: -180, max: 180 }).withMessage('经度必须在-180到180之间'),
    query('provider').optional().isIn(['baidu', 'google']).withMessage('服务提供商必须是baidu或google')
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

      const { lat, lng, provider = 'baidu' } = req.query
      const result = await mapService.reverseGeocode(parseFloat(lat), parseFloat(lng), provider)
      
      if (result) {
        res.json({
          success: true,
          data: result
        })
      } else {
        res.status(400).json({
          success: false,
          message: '逆地理编码失败'
        })
      }

    } catch (error) {
      console.error('逆地理编码失败:', error)
      res.status(500).json({
        success: false,
        message: '逆地理编码服务暂时不可用'
      })
    }
  }
)

// 计算两点间距离
router.get('/distance',
  [
    query('lat1').isFloat({ min: -90, max: 90 }).withMessage('起点纬度必须在-90到90之间'),
    query('lng1').isFloat({ min: -180, max: 180 }).withMessage('起点经度必须在-180到180之间'),
    query('lat2').isFloat({ min: -90, max: 90 }).withMessage('终点纬度必须在-90到90之间'),
    query('lng2').isFloat({ min: -180, max: 180 }).withMessage('终点经度必须在-180到180之间'),
    query('unit').optional().isIn(['km', 'mi']).withMessage('距离单位必须是km或mi')
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

      const { lat1, lng1, lat2, lng2, unit = 'km' } = req.query
      const distance = mapService.calculateDistance(
        parseFloat(lat1), parseFloat(lng1),
        parseFloat(lat2), parseFloat(lng2),
        unit
      )
      
      res.json({
        success: true,
        data: {
          distance: distance,
          unit: unit,
          points: {
            start: { lat: parseFloat(lat1), lng: parseFloat(lng1) },
            end: { lat: parseFloat(lat2), lng: parseFloat(lng2) }
          }
        }
      })

    } catch (error) {
      console.error('计算距离失败:', error)
      res.status(500).json({
        success: false,
        message: '距离计算失败'
      })
    }
  }
)

// 搜索附近地点
router.get('/nearby',
  [
    query('lat').isFloat({ min: -90, max: 90 }).withMessage('纬度必须在-90到90之间'),
    query('lng').isFloat({ min: -180, max: 180 }).withMessage('经度必须在-180到180之间'),
    query('radius').optional().isInt({ min: 100, max: 50000 }).withMessage('搜索半径必须在100-50000米之间'),
    query('keyword').optional().trim().isLength({ max: 50 }).withMessage('关键词长度不能超过50字符'),
    query('provider').optional().isIn(['baidu', 'google']).withMessage('服务提供商必须是baidu或google')
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

      const { lat, lng, radius = 1000, keyword = '', provider = 'baidu' } = req.query
      const results = await mapService.searchNearby(
        parseFloat(lat), parseFloat(lng),
        parseInt(radius), keyword, provider
      )
      
      res.json({
        success: true,
        data: {
          location: { lat: parseFloat(lat), lng: parseFloat(lng) },
          radius: parseInt(radius),
          keyword: keyword,
          results: results,
          count: results.length
        }
      })

    } catch (error) {
      console.error('附近搜索失败:', error)
      res.status(500).json({
        success: false,
        message: '附近搜索服务暂时不可用'
      })
    }
  }
)

// 路线规划
router.get('/route',
  [
    query('originLat').isFloat({ min: -90, max: 90 }).withMessage('起点纬度必须在-90到90之间'),
    query('originLng').isFloat({ min: -180, max: 180 }).withMessage('起点经度必须在-180到180之间'),
    query('destLat').isFloat({ min: -90, max: 90 }).withMessage('终点纬度必须在-90到90之间'),
    query('destLng').isFloat({ min: -180, max: 180 }).withMessage('终点经度必须在-180到180之间'),
    query('mode').optional().isIn(['driving', 'walking', 'transit', 'riding']).withMessage('出行方式必须是driving、walking、transit或riding'),
    query('provider').optional().isIn(['baidu', 'google']).withMessage('服务提供商必须是baidu或google')
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

      const { originLat, originLng, destLat, destLng, mode = 'driving', provider = 'baidu' } = req.query
      const result = await mapService.getRoute(
        parseFloat(originLat), parseFloat(originLng),
        parseFloat(destLat), parseFloat(destLng),
        mode, provider
      )
      
      if (result) {
        res.json({
          success: true,
          data: result
        })
      } else {
        res.status(400).json({
          success: false,
          message: '路线规划失败'
        })
      }

    } catch (error) {
      console.error('路线规划失败:', error)
      res.status(500).json({
        success: false,
        message: '路线规划服务暂时不可用'
      })
    }
  }
)

// 获取IP地址地理位置
router.get('/ip-location',
  [
    query('ip').optional().isIP().withMessage('IP地址格式不正确')
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

      const { ip } = req.query
      const clientIP = ip || req.ip || req.connection.remoteAddress
      const result = await mapService.getLocationByIP(clientIP)
      
      if (result) {
        res.json({
          success: true,
          data: result
        })
      } else {
        res.status(400).json({
          success: false,
          message: 'IP地理位置查询失败'
        })
      }

    } catch (error) {
      console.error('IP地理位置查询失败:', error)
      res.status(500).json({
        success: false,
        message: 'IP地理位置查询服务暂时不可用'
      })
    }
  }
)

// 获取地图服务状态
router.get('/status', optionalAuth, async (req, res) => {
  try {
    const status = mapService.getServiceStatus()
    
    res.json({
      success: true,
      data: status
    })

  } catch (error) {
    console.error('获取地图服务状态失败:', error)
    res.status(500).json({
      success: false,
      message: '获取地图服务状态失败'
    })
  }
})

// 批量地理编码
router.post('/batch-geocode',
  [
    body('addresses').isArray({ min: 1, max: 50 }).withMessage('地址列表必须是包含1-50个地址的数组'),
    body('addresses.*').trim().isLength({ min: 1, max: 200 }).withMessage('每个地址长度必须在1-200字符之间'),
    body('provider').optional().isIn(['baidu', 'google']).withMessage('服务提供商必须是baidu或google')
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

      const { addresses, provider = 'baidu' } = req.body
      const results = []
      
      for (const address of addresses) {
        try {
          const result = await mapService.geocode(address, provider)
          results.push({
            address: address,
            success: true,
            data: result
          })
        } catch (error) {
          results.push({
            address: address,
            success: false,
            error: error.message
          })
        }
      }
      
      res.json({
        success: true,
        data: {
          results: results,
          total: addresses.length,
          successful: results.filter(r => r.success).length
        }
      })

    } catch (error) {
      console.error('批量地理编码失败:', error)
      res.status(500).json({
        success: false,
        message: '批量地理编码服务暂时不可用'
      })
    }
  }
)

export default router