import request from 'supertest'
import app from '../app.js'
import { testUtils } from './setup.js'

describe('端到端测试 (E2E)', () => {
  describe('完整的贴吧社区流程', () => {
    let adminToken: string
    let adminId: string
    let userToken: string
    let userId: string
    let tiebaId: string
    let postId: string
    let commentId: string
    
    beforeAll(async () => {
      // 创建管理员用户
      const adminData = testUtils.createTestUser({
        username: 'admin',
        email: 'admin@example.com',
        nickname: '系统管理员'
      })
      
      const adminResponse = await request(app)
        .post('/api/auth/register')
        .send(adminData)
      
      adminToken = adminResponse.body.data.token
      adminId = adminResponse.body.data.user.id
      
      // 创建普通用户
      const userData = testUtils.createTestUser({
        username: 'e2euser',
        email: 'e2euser@example.com',
        nickname: '端到端测试用户'
      })
      
      const userResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
      
      userToken = userResponse.body.data.token
      userId = userResponse.body.data.user.id
    })

    it('应该完成从注册到社区互动的完整流程', async () => {
      // 阶段1: 用户注册和登录
      console.log('阶段1: 用户注册和登录')
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'e2euser',
          password: 'password123'
        })
        .expect(200)
      
      expect(loginResponse.body.success).toBe(true)
      expect(loginResponse.body.data.token).toBeDefined()

      // 阶段2: 浏览贴吧
      console.log('阶段2: 浏览贴吧')
      
      const tiebasResponse = await request(app)
        .get('/api/tiebas')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
      
      expect(tiebasResponse.body.success).toBe(true)
      expect(tiebasResponse.body.data.tiebas).toBeDefined()

      // 阶段3: 创建贴吧
      console.log('阶段3: 创建贴吧')
      
      const tiebaData = testUtils.createTestTieba({
        name: '端到端测试贴吧',
        description: '这是端到端测试创建的贴吧社区'
      })
      
      const createTiebaResponse = await request(app)
        .post('/api/tiebas')
        .set('Authorization', `Bearer ${userToken}`)
        .send(tiebaData)
        .expect(201)
      
      expect(createTiebaResponse.body.success).toBe(true)
      tiebaId = createTiebaResponse.body.data._id

      // 阶段4: 在贴吧中发帖
      console.log('阶段4: 在贴吧中发帖')
      
      const postData = testUtils.createTestPost({
        title: '端到端测试帖子',
        content: '这是端到端测试创建的帖子内容，包含丰富的格式和标签。',
        tags: ['测试', '端到端', '示例']
      })
      
      const createPostResponse = await request(app)
        .post(`/api/tiebas/${tiebaId}/posts`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(postData)
        .expect(201)
      
      expect(createPostResponse.body.success).toBe(true)
      postId = createPostResponse.body.data._id

      // 阶段5: 其他用户加入贴吧并互动
      console.log('阶段5: 其他用户加入贴吧并互动')
      
      // 管理员加入贴吧
      const joinResponse = await request(app)
        .post(`/api/tiebas/${tiebaId}/join`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
      
      expect(joinResponse.body.success).toBe(true)

      // 管理员评论帖子
      const commentData = testUtils.createTestComment({
        content: '这是一个很有意义的帖子，感谢分享！'
      })
      
      const createCommentResponse = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(commentData)
        .expect(201)
      
      expect(createCommentResponse.body.success).toBe(true)
      commentId = createCommentResponse.body.data._id

      // 阶段6: 消息互动
      console.log('阶段6: 消息互动')
      
      // 管理员发送私信给用户
      const messageData = testUtils.createTestMessage({
        content: '你好！我对你在贴吧中的帖子很感兴趣，我们可以进一步交流吗？'
      })
      
      const sendMessageResponse = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...messageData,
          receiver: userId
        })
        .expect(201)
      
      expect(sendMessageResponse.body.success).toBe(true)

      // 用户回复私信
      const replyMessageData = testUtils.createTestMessage({
        content: '谢谢您的关注！我很乐意与您交流更多关于这个话题的内容。'
      })
      
      const replyMessageResponse = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          ...replyMessageData,
          receiver: adminId
        })
        .expect(201)
      
      expect(replyMessageResponse.body.success).toBe(true)

      // 阶段7: 使用第三方服务
      console.log('阶段7: 使用第三方服务')
      
      // 用户分享帖子到社交平台
      const shareResponse = await request(app)
        .post('/api/social/share')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: '我在贴吧发布的帖子',
          content: postData.content.substring(0, 100) + '...',
          url: `https://example.com/posts/${postId}`,
          platforms: ['weibo', 'qq']
        })
        .expect(200)
      
      expect(shareResponse.body.success).toBe(true)

      // 用户设置通知偏好
      const notificationSettingsResponse = await request(app)
        .put('/api/notifications/settings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          systemNotifications: true,
          messageNotifications: true,
          likeNotifications: true,
          commentNotifications: true
        })
        .expect(200)
      
      expect(notificationSettingsResponse.body.success).toBe(true)

      // 阶段8: 社区管理
      console.log('阶段8: 社区管理')
      
      // 更新贴吧信息
      const updateTiebaResponse = await request(app)
        .put(`/api/tiebas/${tiebaId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          description: '更新后的贴吧描述：欢迎所有对端到端测试感兴趣的朋友！',
          rules: '1. 尊重他人\n2. 禁止广告\n3. 保持友好交流'
        })
        .expect(200)
      
      expect(updateTiebaResponse.body.success).toBe(true)

      // 获取贴吧成员列表
      const membersResponse = await request(app)
        .get(`/api/tiebas/${tiebaId}/members`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
      
      expect(membersResponse.body.success).toBe(true)
      expect(membersResponse.body.data.members).toHaveLength(2)

      // 阶段9: 数据统计和分析
      console.log('阶段9: 数据统计和分析')
      
      // 获取帖子详情（包含阅读统计）
      const postDetailResponse = await request(app)
        .get(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
      
      expect(postDetailResponse.body.success).toBe(true)
      expect(postDetailResponse.body.data.readCount).toBeGreaterThanOrEqual(1)

      // 获取分享统计
      const shareStatsResponse = await request(app)
        .get('/api/social/stats')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
      
      expect(shareStatsResponse.body.success).toBe(true)

      // 阶段10: 清理和退出
      console.log('阶段10: 清理和退出')
      
      // 用户退出贴吧
      const leaveResponse = await request(app)
        .post(`/api/tiebas/${tiebaId}/leave`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
      
      expect(leaveResponse.body.success).toBe(true)

      // 用户注销
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
      
      expect(logoutResponse.body.success).toBe(true)

      console.log('端到端测试完成！所有阶段都成功执行。')
    }, 30000) // 设置较长的超时时间
  })

  describe('多用户并发场景', () => {
    it('应该处理多个用户同时使用系统的场景', async () => {
      // 创建多个测试用户
      const userCount = 3
      const userTokens = []
      const userIds = []
      
      for (let i = 0; i < userCount; i++) {
        const userData = testUtils.createTestUser({
          username: `concurrentuser${i}`,
          email: `concurrent${i}@example.com`
        })
        
        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
        
        userTokens.push(response.body.data.token)
        userIds.push(response.body.data.user.id)
      }
      
      // 并发操作：多个用户同时浏览贴吧
      const browsePromises = userTokens.map(token => 
        request(app)
          .get('/api/tiebas')
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
      )
      
      const browseResponses = await Promise.all(browsePromises)
      browseResponses.forEach(response => {
        expect(response.body.success).toBe(true)
      })
      
      // 创建一个共享的贴吧
      const tiebaData = testUtils.createTestTieba({
        name: '并发测试贴吧',
        description: '用于并发场景测试的贴吧'
      })
      
      const createTiebaResponse = await request(app)
        .post('/api/tiebas')
        .set('Authorization', `Bearer ${userTokens[0]}`)
        .send(tiebaData)
        .expect(201)
      
      const tiebaId = createTiebaResponse.body.data._id
      
      // 其他用户同时加入贴吧
      const joinPromises = userTokens.slice(1).map(token =>
        request(app)
          .post(`/api/tiebas/${tiebaId}/join`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
      )
      
      const joinResponses = await Promise.all(joinPromises)
      joinResponses.forEach(response => {
        expect(response.body.success).toBe(true)
      })
      
      // 多个用户同时发帖
      const postPromises = userTokens.map((token, index) => {
        const postData = testUtils.createTestPost({
          title: `并发帖子 ${index + 1}`,
          content: `这是用户 ${index + 1} 在并发测试中创建的帖子`
        })
        
        return request(app)
          .post(`/api/tiebas/${tiebaId}/posts`)
          .set('Authorization', `Bearer ${token}`)
          .send(postData)
          .expect(201)
      })
      
      const postResponses = await Promise.all(postPromises)
      postResponses.forEach(response => {
        expect(response.body.success).toBe(true)
      })
      
      // 验证所有帖子都创建成功
      const postsResponse = await request(app)
        .get(`/api/tiebas/${tiebaId}/posts`)
        .set('Authorization', `Bearer ${userTokens[0]}`)
        .expect(200)
      
      expect(postsResponse.body.success).toBe(true)
      expect(postsResponse.body.data.posts).toHaveLength(userCount)
    }, 20000)
  })

  describe('错误恢复和边界情况', () => {
    it('应该处理系统异常和边界情况', async () => {
      // 测试无效的API端点
      await request(app)
        .get('/api/nonexistent-endpoint')
        .expect(404)
      
      // 测试无效的认证
      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)
      
      // 测试过大的请求体
      const largeData = { data: 'x'.repeat(100000) } // 100KB数据
      await request(app)
        .post('/api/tiebas')
        .set('Authorization', `Bearer some-token`)
        .send(largeData)
        .expect(413) // 请求体过大
      
      // 测试SQL注入防护
      const sqlInjectionData = {
        name: "test'; DROP TABLE users; --",
        description: "正常描述"
      }
      
      // 系统应该正确处理这种输入，而不是崩溃
      const userData = testUtils.createTestUser({
        username: 'securitytest',
        email: 'security@example.com'
      })
      
      const userResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
      
      const userToken = userResponse.body.data.token
      
      // 尝试创建包含特殊字符的贴吧
      const createResponse = await request(app)
        .post('/api/tiebas')
        .set('Authorization', `Bearer ${userToken}`)
        .send(sqlInjectionData)
      
      // 系统应该返回400错误而不是执行SQL注入
      expect(createResponse.status).toBe(400)
    })
  })

  describe('性能基准测试', () => {
    it('应该测量关键API的性能指标', async () => {
      // 创建测试用户
      const userData = testUtils.createTestUser({
        username: 'performanceuser',
        email: 'performance@example.com'
      })
      
      const userResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
      
      const userToken = userResponse.body.data.token
      
      // 测量认证API性能
      const authStart = Date.now()
      const authResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'performanceuser',
          password: 'password123'
        })
      
      const authTime = Date.now() - authStart
      expect(authResponse.status).toBe(200)
      expect(authTime).toBeLessThan(1000) // 认证应在1秒内完成
      
      // 测量贴吧列表API性能
      const tiebasStart = Date.now()
      const tiebasResponse = await request(app)
        .get('/api/tiebas')
        .set('Authorization', `Bearer ${userToken}`)
      
      const tiebasTime = Date.now() - tiebasStart
      expect(tiebasResponse.status).toBe(200)
      expect(tiebasTime).toBeLessThan(500) // 贴吧列表应在500ms内返回
      
      // 测量搜索API性能
      const searchStart = Date.now()
      const searchResponse = await request(app)
        .get('/api/tiebas/search?q=测试')
        .set('Authorization', `Bearer ${userToken}`)
      
      const searchTime = Date.now() - searchStart
      expect(searchResponse.status).toBe(200)
      expect(searchTime).toBeLessThan(800) // 搜索应在800ms内完成
      
      console.log(`性能基准测试结果：`)
      console.log(`- 认证API: ${authTime}ms`)
      console.log(`- 贴吧列表API: ${tiebasTime}ms`)
      console.log(`- 搜索API: ${searchTime}ms`)
    })
  })

  describe('数据一致性验证', () => {
    it('应该验证系统数据的一致性', async () => {
      // 创建测试数据
      const userData = testUtils.createTestUser({
        username: 'consistencyuser',
        email: 'consistency@example.com'
      })
      
      const userResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
      
      const userToken = userResponse.body.data.token
      
      // 创建贴吧
      const tiebaData = testUtils.createTestTieba({
        name: '一致性测试贴吧'
      })
      
      const tiebaResponse = await request(app)
        .post('/api/tiebas')
        .set('Authorization', `Bearer ${userToken}`)
        .send(tiebaData)
      
      const tiebaId = tiebaResponse.body.data._id
      
      // 创建帖子
      const postData = testUtils.createTestPost()
      const postResponse = await request(app)
        .post(`/api/tiebas/${tiebaId}/posts`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(postData)
      
      const postId = postResponse.body.data._id
      
      // 验证数据一致性：贴吧帖子数量
      const tiebaDetailResponse = await request(app)
        .get(`/api/tiebas/${tiebaId}`)
        .set('Authorization', `Bearer ${userToken}`)
      
      expect(tiebaDetailResponse.body.data.postCount).toBe(1)
      
      // 验证数据一致性：帖子详情
      const postDetailResponse = await request(app)
        .get(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${userToken}`)
      
      expect(postDetailResponse.body.data.tieba).toBe(tiebaId)
      expect(postDetailResponse.body.data.author).toBe(userResponse.body.data.user.id)
      
      // 删除帖子后验证数据一致性
      await request(app)
        .delete(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${userToken}`)
      
      const updatedTiebaResponse = await request(app)
        .get(`/api/tiebas/${tiebaId}`)
        .set('Authorization', `Bearer ${userToken}`)
      
      expect(updatedTiebaResponse.body.data.postCount).toBe(0)
    })
  })
})