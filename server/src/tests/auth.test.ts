import request from 'supertest'
import app from '../app.js'
import User from '../models/User.js'
import { testUtils } from './setup.js'

describe('用户认证系统', () => {
  describe('用户注册', () => {
    it('应该成功注册新用户', async () => {
      const userData = testUtils.createTestUser()
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.user.username).toBe(userData.username)
      expect(response.body.data.user.email).toBe(userData.email)
      expect(response.body.data.token).toBeValidJWT()
      
      // 验证用户已保存到数据库
      const savedUser = await User.findOne({ username: userData.username })
      expect(savedUser).toBeTruthy()
      expect(savedUser?.email).toBe(userData.email)
    })

    it('应该拒绝重复的用户名', async () => {
      const userData = testUtils.createTestUser()
      
      // 先注册一个用户
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)
      
      // 尝试用相同的用户名注册
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)
      
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('用户名已存在')
    })

    it('应该拒绝无效的邮箱格式', async () => {
      const userData = testUtils.createTestUser({ email: 'invalid-email' })
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)
      
      expect(response.body.success).toBe(false)
      expect(response.body.errors).toBeDefined()
    })

    it('应该拒绝过短的密码', async () => {
      const userData = testUtils.createTestUser({ password: '123' })
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)
      
      expect(response.body.success).toBe(false)
      expect(response.body.errors).toBeDefined()
    })
  })

  describe('用户登录', () => {
    beforeEach(async () => {
      // 注册一个测试用户
      const userData = testUtils.createTestUser()
      await request(app)
        .post('/api/auth/register')
        .send(userData)
    })

    it('应该成功登录', async () => {
      const loginData = {
        username: 'testuser',
        password: 'password123'
      }
      
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.user.username).toBe(loginData.username)
      expect(response.body.data.token).toBeValidJWT()
    })

    it('应该拒绝错误的密码', async () => {
      const loginData = {
        username: 'testuser',
        password: 'wrongpassword'
      }
      
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401)
      
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('用户名或密码错误')
    })

    it('应该拒绝不存在的用户', async () => {
      const loginData = {
        username: 'nonexistent',
        password: 'password123'
      }
      
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401)
      
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('用户名或密码错误')
    })
  })

  describe('用户信息获取', () => {
    let authToken: string
    
    beforeEach(async () => {
      // 注册并登录用户
      const userData = testUtils.createTestUser()
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
      
      authToken = registerResponse.body.data.token
    })

    it('应该成功获取当前用户信息', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.username).toBe('testuser')
      expect(response.body.data.email).toBe('test@example.com')
    })

    it('应该拒绝未认证的请求', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401)
      
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('未提供认证令牌')
    })

    it('应该拒绝无效的令牌', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)
      
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('无效的认证令牌')
    })
  })

  describe('用户信息更新', () => {
    let authToken: string
    
    beforeEach(async () => {
      // 注册并登录用户
      const userData = testUtils.createTestUser()
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
      
      authToken = registerResponse.body.data.token
    })

    it('应该成功更新用户信息', async () => {
      const updateData = {
        nickname: '新昵称',
        bio: '新的个人简介',
        avatar: 'https://example.com/new-avatar.jpg'
      }
      
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.nickname).toBe(updateData.nickname)
      expect(response.body.data.bio).toBe(updateData.bio)
      expect(response.body.data.avatar).toBe(updateData.avatar)
    })

    it('应该拒绝无效的更新数据', async () => {
      const updateData = {
        email: 'invalid-email'
      }
      
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400)
      
      expect(response.body.success).toBe(false)
      expect(response.body.errors).toBeDefined()
    })
  })

  describe('密码修改', () => {
    let authToken: string
    
    beforeEach(async () => {
      // 注册并登录用户
      const userData = testUtils.createTestUser()
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
      
      authToken = registerResponse.body.data.token
    })

    it('应该成功修改密码', async () => {
      const passwordData = {
        currentPassword: 'password123',
        newPassword: 'newpassword123'
      }
      
      const response = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain('密码修改成功')
      
      // 验证新密码可以登录
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'newpassword123'
        })
        .expect(200)
      
      expect(loginResponse.body.success).toBe(true)
    })

    it('应该拒绝错误的当前密码', async () => {
      const passwordData = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123'
      }
      
      const response = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(400)
      
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('当前密码错误')
    })

    it('应该拒绝过短的新密码', async () => {
      const passwordData = {
        currentPassword: 'password123',
        newPassword: '123'
      }
      
      const response = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(400)
      
      expect(response.body.success).toBe(false)
      expect(response.body.errors).toBeDefined()
    })
  })

  describe('用户注销', () => {
    let authToken: string
    
    beforeEach(async () => {
      // 注册并登录用户
      const userData = testUtils.createTestUser()
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
      
      authToken = registerResponse.body.data.token
    })

    it('应该成功注销用户', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain('注销成功')
      
      // 验证令牌已失效
      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401)
      
      expect(meResponse.body.success).toBe(false)
    })
  })
})