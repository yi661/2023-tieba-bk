import request from 'supertest'
import app from '../app.js'
import User from '../models/User.js'
import Tieba from '../models/Tieba.js'
import { testUtils } from './setup.js'

describe('贴吧核心功能', () => {
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

  describe('贴吧创建', () => {
    it('应该成功创建贴吧', async () => {
      const tiebaData = testUtils.createTestTieba()
      
      const response = await request(app)
        .post('/api/tiebas')
        .set('Authorization', `Bearer ${authToken}`)
        .send(tiebaData)
        .expect(201)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.name).toBe(tiebaData.name)
      expect(response.body.data.title).toBe(tiebaData.title)
      expect(response.body.data.creator).toBe(userId)
      
      // 验证贴吧已保存到数据库
      const savedTieba = await Tieba.findOne({ name: tiebaData.name })
      expect(savedTieba).toBeTruthy()
      expect(savedTieba?.title).toBe(tiebaData.title)
    })

    it('应该拒绝重复的贴吧名称', async () => {
      const tiebaData = testUtils.createTestTieba()
      
      // 先创建一个贴吧
      await request(app)
        .post('/api/tiebas')
        .set('Authorization', `Bearer ${authToken}`)
        .send(tiebaData)
        .expect(201)
      
      // 尝试用相同的名称创建贴吧
      const response = await request(app)
        .post('/api/tiebas')
        .set('Authorization', `Bearer ${authToken}`)
        .send(tiebaData)
        .expect(400)
      
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('贴吧名称已存在')
    })

    it('应该拒绝无效的贴吧数据', async () => {
      const invalidTiebaData = {
        name: 'ab', // 名称过短
        title: '' // 标题为空
      }
      
      const response = await request(app)
        .post('/api/tiebas')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidTiebaData)
        .expect(400)
      
      expect(response.body.success).toBe(false)
      expect(response.body.errors).toBeDefined()
    })

    it('应该拒绝未认证的请求', async () => {
      const tiebaData = testUtils.createTestTieba()
      
      const response = await request(app)
        .post('/api/tiebas')
        .send(tiebaData)
        .expect(401)
      
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('未提供认证令牌')
    })
  })

  describe('贴吧列表获取', () => {
    beforeEach(async () => {
      // 创建几个测试贴吧
      const tiebas = [
        testUtils.createTestTieba({ name: 'tieba1', title: '贴吧一' }),
        testUtils.createTestTieba({ name: 'tieba2', title: '贴吧二' }),
        testUtils.createTestTieba({ name: 'tieba3', title: '贴吧三' })
      ]
      
      for (const tiebaData of tiebas) {
        await request(app)
          .post('/api/tiebas')
          .set('Authorization', `Bearer ${authToken}`)
          .send(tiebaData)
      }
    })

    it('应该成功获取贴吧列表', async () => {
      const response = await request(app)
        .get('/api/tiebas')
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.tiebas).toHaveLength(3)
      expect(response.body.data.pagination.total).toBe(3)
      expect(response.body.data.pagination.page).toBe(1)
      expect(response.body.data.pagination.limit).toBe(20)
    })

    it('应该支持分页查询', async () => {
      const response = await request(app)
        .get('/api/tiebas?page=1&limit=2')
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.tiebas).toHaveLength(2)
      expect(response.body.data.pagination.total).toBe(3)
      expect(response.body.data.pagination.page).toBe(1)
      expect(response.body.data.pagination.limit).toBe(2)
    })

    it('应该支持搜索功能', async () => {
      const response = await request(app)
        .get('/api/tiebas?search=贴吧一')
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.tiebas).toHaveLength(1)
      expect(response.body.data.tiebas[0].title).toBe('贴吧一')
    })

    it('应该支持分类筛选', async () => {
      const response = await request(app)
        .get('/api/tiebas?category=test')
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.tiebas).toHaveLength(3)
    })
  })

  describe('贴吧详情获取', () => {
    let tiebaId: string
    
    beforeEach(async () => {
      // 创建一个测试贴吧
      const tiebaData = testUtils.createTestTieba()
      const createResponse = await request(app)
        .post('/api/tiebas')
        .set('Authorization', `Bearer ${authToken}`)
        .send(tiebaData)
      
      tiebaId = createResponse.body.data._id
    })

    it('应该成功获取贴吧详情', async () => {
      const response = await request(app)
        .get(`/api/tiebas/${tiebaId}`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data._id).toBe(tiebaId)
      expect(response.body.data.name).toBe('testtieba')
      expect(response.body.data.title).toBe('测试贴吧')
    })

    it('应该返回不存在的贴吧错误', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011' // 有效的ObjectId但不存在的贴吧
      
      const response = await request(app)
        .get(`/api/tiebas/${nonExistentId}`)
        .expect(404)
      
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('贴吧不存在')
    })

    it('应该返回无效的ID错误', async () => {
      const response = await request(app)
        .get('/api/tiebas/invalid-id')
        .expect(400)
      
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('无效的贴吧ID')
    })
  })

  describe('贴吧信息更新', () => {
    let tiebaId: string
    
    beforeEach(async () => {
      // 创建一个测试贴吧
      const tiebaData = testUtils.createTestTieba()
      const createResponse = await request(app)
        .post('/api/tiebas')
        .set('Authorization', `Bearer ${authToken}`)
        .send(tiebaData)
      
      tiebaId = createResponse.body.data._id
    })

    it('应该成功更新贴吧信息', async () => {
      const updateData = {
        title: '更新后的贴吧标题',
        description: '更新后的贴吧描述',
        avatar: 'https://example.com/new-avatar.jpg'
      }
      
      const response = await request(app)
        .put(`/api/tiebas/${tiebaId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.title).toBe(updateData.title)
      expect(response.body.data.description).toBe(updateData.description)
      expect(response.body.data.avatar).toBe(updateData.avatar)
    })

    it('应该拒绝非创建者的更新请求', async () => {
      // 创建另一个用户
      const anotherUserData = testUtils.createTestUser({
        username: 'anotheruser',
        email: 'another@example.com'
      })
      
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(anotherUserData)
      
      const anotherAuthToken = registerResponse.body.data.token
      
      const updateData = {
        title: '尝试更新的标题'
      }
      
      const response = await request(app)
        .put(`/api/tiebas/${tiebaId}`)
        .set('Authorization', `Bearer ${anotherAuthToken}`)
        .send(updateData)
        .expect(403)
      
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('没有权限修改此贴吧')
    })

    it('应该拒绝无效的更新数据', async () => {
      const invalidUpdateData = {
        name: 'ab' // 名称过短
      }
      
      const response = await request(app)
        .put(`/api/tiebas/${tiebaId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdateData)
        .expect(400)
      
      expect(response.body.success).toBe(false)
      expect(response.body.errors).toBeDefined()
    })
  })

  describe('贴吧删除', () => {
    let tiebaId: string
    
    beforeEach(async () => {
      // 创建一个测试贴吧
      const tiebaData = testUtils.createTestTieba()
      const createResponse = await request(app)
        .post('/api/tiebas')
        .set('Authorization', `Bearer ${authToken}`)
        .send(tiebaData)
      
      tiebaId = createResponse.body.data._id
    })

    it('应该成功删除贴吧', async () => {
      const response = await request(app)
        .delete(`/api/tiebas/${tiebaId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain('贴吧删除成功')
      
      // 验证贴吧已从数据库删除
      const deletedTieba = await Tieba.findById(tiebaId)
      expect(deletedTieba).toBeNull()
    })

    it('应该拒绝非创建者的删除请求', async () => {
      // 创建另一个用户
      const anotherUserData = testUtils.createTestUser({
        username: 'anotheruser',
        email: 'another@example.com'
      })
      
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(anotherUserData)
      
      const anotherAuthToken = registerResponse.body.data.token
      
      const response = await request(app)
        .delete(`/api/tiebas/${tiebaId}`)
        .set('Authorization', `Bearer ${anotherAuthToken}`)
        .expect(403)
      
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('没有权限删除此贴吧')
    })
  })

  describe('贴吧成员管理', () => {
    let tiebaId: string
    let anotherUserId: string
    let anotherAuthToken: string
    
    beforeEach(async () => {
      // 创建一个测试贴吧
      const tiebaData = testUtils.createTestTieba()
      const createResponse = await request(app)
        .post('/api/tiebas')
        .set('Authorization', `Bearer ${authToken}`)
        .send(tiebaData)
      
      tiebaId = createResponse.body.data._id
      
      // 创建另一个用户
      const anotherUserData = testUtils.createTestUser({
        username: 'anotheruser',
        email: 'another@example.com'
      })
      
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(anotherUserData)
      
      anotherAuthToken = registerResponse.body.data.token
      anotherUserId = registerResponse.body.data.user.id
    })

    it('应该成功加入贴吧', async () => {
      const response = await request(app)
        .post(`/api/tiebas/${tiebaId}/join`)
        .set('Authorization', `Bearer ${anotherAuthToken}`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain('成功加入贴吧')
    })

    it('应该成功退出贴吧', async () => {
      // 先加入贴吧
      await request(app)
        .post(`/api/tiebas/${tiebaId}/join`)
        .set('Authorization', `Bearer ${anotherAuthToken}`)
      
      // 然后退出
      const response = await request(app)
        .post(`/api/tiebas/${tiebaId}/leave`)
        .set('Authorization', `Bearer ${anotherAuthToken}`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain('成功退出贴吧')
    })

    it('应该获取贴吧成员列表', async () => {
      // 另一个用户加入贴吧
      await request(app)
        .post(`/api/tiebas/${tiebaId}/join`)
        .set('Authorization', `Bearer ${anotherAuthToken}`)
      
      const response = await request(app)
        .get(`/api/tiebas/${tiebaId}/members`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.members).toHaveLength(2) // 创建者和加入者
      expect(response.body.data.pagination.total).toBe(2)
    })
  })
})