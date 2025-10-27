import request from 'supertest'
import app from '../app.js'
import User from '../models/User.js'
import { testUtils } from './setup.js'

describe('第三方服务集成', () => {
  let authToken: string
  let userId: string
  
  beforeEach(async () => {
    // 注册并登录用户
    const userData = testUtils.createTestUser()
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData)
    
    authToken = registerResponse.body.data.token
    userId = registerResponse.body.data.user.id
  })

  describe('通知服务', () => {
    it('应该获取用户通知设置', async () => {
      const response = await request(app)
        .get('/api/notifications/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.userId).toBe(userId)
      expect(response.body.data.systemNotifications).toBeDefined()
      expect(response.body.data.tiebaNotifications).toBeDefined()
      expect(response.body.data.messageNotifications).toBeDefined()
      expect(response.body.data.likeNotifications).toBeDefined()
      expect(response.body.data.commentNotifications).toBeDefined()
      expect(response.body.data.followNotifications).toBeDefined()
    })

    it('应该更新用户通知设置', async () => {
      const updateData = {
        systemNotifications: false,
        tiebaNotifications: true,
        messageNotifications: false,
        likeNotifications: true,
        commentNotifications: false,
        followNotifications: true
      }
      
      const response = await request(app)
        .put('/api/notifications/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.systemNotifications).toBe(false)
      expect(response.body.data.tiebaNotifications).toBe(true)
      expect(response.body.data.messageNotifications).toBe(false)
      expect(response.body.data.likeNotifications).toBe(true)
      expect(response.body.data.commentNotifications).toBe(false)
      expect(response.body.data.followNotifications).toBe(true)
    })

    it('应该获取未读通知数量', async () => {
      const response = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.count).toBeDefined()
      expect(typeof response.body.data.count).toBe('number')
    })

    it('应该标记通知为已读', async () => {
      // 先发送一个测试通知
      const testResponse = await request(app)
        .post('/api/notifications/test')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'system',
          title: '测试通知',
          content: '这是一个测试通知'
        })
        .expect(200)
      
      const notificationId = testResponse.body.data._id
      
      // 标记为已读
      const response = await request(app)
        .put(`/api/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.isRead).toBe(true)
      expect(response.body.data.readAt).toBeDefined()
    })

    it('应该清除所有通知', async () => {
      const response = await request(app)
        .delete('/api/notifications/clear')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain('通知清除成功')
    })

    it('应该获取通知服务状态', async () => {
      const response = await request(app)
        .get('/api/notifications/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.service).toBe('notification')
      expect(response.body.data.status).toBeDefined()
      expect(response.body.data.lastCheck).toBeDefined()
    })
  })

  describe('地图服务', () => {
    it('应该进行地理编码查询', async () => {
      const response = await request(app)
        .post('/api/maps/geocode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          address: '北京市海淀区中关村'
        })
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.address).toBe('北京市海淀区中关村')
      expect(response.body.data.location).toBeDefined()
      expect(response.body.data.latitude).toBeDefined()
      expect(response.body.data.longitude).toBeDefined()
    })

    it('应该进行逆地理编码查询', async () => {
      const response = await request(app)
        .post('/api/maps/reverse-geocode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          latitude: 39.9042,
          longitude: 116.4074
        })
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.latitude).toBe(39.9042)
      expect(response.body.data.longitude).toBe(116.4074)
      expect(response.body.data.address).toBeDefined()
      expect(response.body.data.formattedAddress).toBeDefined()
    })

    it('应该计算两点间距离', async () => {
      const response = await request(app)
        .post('/api/maps/distance')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          origin: { latitude: 39.9042, longitude: 116.4074 },
          destination: { latitude: 31.2304, longitude: 121.4737 }
        })
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.distance).toBeDefined()
      expect(response.body.data.duration).toBeDefined()
      expect(response.body.data.unit).toBe('km')
    })

    it('应该进行附近搜索', async () => {
      const response = await request(app)
        .post('/api/maps/nearby')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          latitude: 39.9042,
          longitude: 116.4074,
          radius: 1000,
          keyword: '餐厅'
        })
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.results).toBeDefined()
      expect(Array.isArray(response.body.data.results)).toBe(true)
      expect(response.body.data.pagination).toBeDefined()
    })

    it('应该进行路线规划', async () => {
      const response = await request(app)
        .post('/api/maps/route')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          origin: { latitude: 39.9042, longitude: 116.4074 },
          destination: { latitude: 31.2304, longitude: 121.4737 },
          mode: 'driving'
        })
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.routes).toBeDefined()
      expect(Array.isArray(response.body.data.routes)).toBe(true)
      expect(response.body.data.distance).toBeDefined()
      expect(response.body.data.duration).toBeDefined()
    })

    it('应该查询IP地址地理位置', async () => {
      const response = await request(app)
        .get('/api/maps/ip-location')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ ip: '8.8.8.8' })
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.ip).toBe('8.8.8.8')
      expect(response.body.data.country).toBeDefined()
      expect(response.body.data.region).toBeDefined()
      expect(response.body.data.city).toBeDefined()
    })

    it('应该获取地图服务状态', async () => {
      const response = await request(app)
        .get('/api/maps/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.service).toBe('map')
      expect(response.body.data.status).toBeDefined()
      expect(response.body.data.providers).toBeDefined()
    })

    it('应该支持批量地理编码', async () => {
      const response = await request(app)
        .post('/api/maps/batch-geocode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          addresses: [
            '北京市海淀区中关村',
            '上海市浦东新区陆家嘴',
            '广州市天河区珠江新城'
          ]
        })
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.results).toBeDefined()
      expect(Array.isArray(response.body.data.results)).toBe(true)
      expect(response.body.data.results).toHaveLength(3)
    })
  })

  describe('社交分享服务', () => {
    it('应该生成分享链接', async () => {
      const response = await request(app)
        .post('/api/social/share')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '测试分享',
          content: '这是一个测试分享内容',
          url: 'https://example.com/test',
          platforms: ['weibo', 'qq', 'wechat']
        })
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.links).toBeDefined()
      expect(Array.isArray(response.body.data.links)).toBe(true)
      expect(response.body.data.links).toHaveLength(3)
      
      const weiboLink = response.body.data.links.find((link: any) => link.platform === 'weibo')
      expect(weiboLink).toBeDefined()
      expect(weiboLink.url).toBeDefined()
    })

    it('应该批量生成分享链接', async () => {
      const response = await request(app)
        .post('/api/social/batch-share')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            {
              title: '分享一',
              content: '内容一',
              url: 'https://example.com/1',
              platforms: ['weibo']
            },
            {
              title: '分享二', 
              content: '内容二',
              url: 'https://example.com/2',
              platforms: ['qq']
            }
          ]
        })
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.results).toBeDefined()
      expect(Array.isArray(response.body.data.results)).toBe(true)
      expect(response.body.data.results).toHaveLength(2)
    })

    it('应该获取分享统计', async () => {
      const response = await request(app)
        .get('/api/social/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ 
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        })
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.totalShares).toBeDefined()
      expect(response.body.data.platformStats).toBeDefined()
      expect(response.body.data.dailyStats).toBeDefined()
    })

    it('应该记录分享行为', async () => {
      const response = await request(app)
        .post('/api/social/record')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          platform: 'weibo',
          contentId: 'test-content-123',
          contentType: 'post',
          shareUrl: 'https://example.com/share/123'
        })
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.platform).toBe('weibo')
      expect(response.body.data.contentId).toBe('test-content-123')
      expect(response.body.data.contentType).toBe('post')
    })

    it('应该获取热门分享内容', async () => {
      const response = await request(app)
        .get('/api/social/popular')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10 })
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.items).toBeDefined()
      expect(Array.isArray(response.body.data.items)).toBe(true)
      expect(response.body.data.pagination).toBeDefined()
    })

    it('应该生成二维码', async () => {
      const response = await request(app)
        .post('/api/social/qrcode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          text: 'https://example.com/qr-test',
          size: 200
        })
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.qrCode).toBeDefined()
      expect(response.body.data.format).toBe('base64')
    })

    it('应该获取分享平台配置', async () => {
      const response = await request(app)
        .get('/api/social/platforms')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.platforms).toBeDefined()
      expect(Array.isArray(response.body.data.platforms)).toBe(true)
      
      const weiboPlatform = response.body.data.platforms.find((p: any) => p.id === 'weibo')
      expect(weiboPlatform).toBeDefined()
      expect(weiboPlatform.name).toBeDefined()
      expect(weiboPlatform.enabled).toBeDefined()
    })

    it('应该测试分享服务', async () => {
      const response = await request(app)
        .get('/api/social/test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.service).toBe('social')
      expect(response.body.data.status).toBeDefined()
      expect(response.body.data.platforms).toBeDefined()
    })

    it('应该获取用户分享历史', async () => {
      const response = await request(app)
        .get('/api/social/history')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ 
          page: 1, 
          limit: 20 
        })
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.shares).toBeDefined()
      expect(Array.isArray(response.body.data.shares)).toBe(true)
      expect(response.body.data.pagination).toBeDefined()
    })
  })

  describe('第三方服务健康检查', () => {
    it('应该检查所有第三方服务状态', async () => {
      const response = await request(app)
        .get('/api/health/third-party')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.services).toBeDefined()
      expect(Array.isArray(response.body.data.services)).toBe(true)
      
      const notificationService = response.body.data.services.find((s: any) => s.service === 'notification')
      const mapService = response.body.data.services.find((s: any) => s.service === 'map')
      const socialService = response.body.data.services.find((s: any) => s.service === 'social')
      
      expect(notificationService).toBeDefined()
      expect(mapService).toBeDefined()
      expect(socialService).toBeDefined()
    })
  })
})