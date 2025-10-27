import request from 'supertest'
import app from '../app.js'
import User from '../models/User.js'
import Tieba from '../models/Tieba.js'
import Post from '../models/Post.js'
import Comment from '../models/Comment.js'
import Message from '../models/Message.js'
import { testUtils } from './setup.js'

describe('系统集成测试', () => {
  let authToken: string
  let userId: string
  let tiebaId: string
  let postId: string
  
  beforeEach(async () => {
    // 注册并登录用户
    const userData = testUtils.createTestUser()
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData)
    
    authToken = registerResponse.body.data.token
    userId = registerResponse.body.data.user.id
    
    // 创建一个测试贴吧
    const tiebaData = testUtils.createTestTieba()
    const tiebaResponse = await request(app)
      .post('/api/tiebas')
      .set('Authorization', `Bearer ${authToken}`)
      .send(tiebaData)
    
    tiebaId = tiebaResponse.body.data._id
    
    // 创建一个测试帖子
    const postData = testUtils.createTestPost()
    const postResponse = await request(app)
      .post(`/api/tiebas/${tiebaId}/posts`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(postData)
    
    postId = postResponse.body.data._id
  })

  describe('完整用户流程', () => {
    it('应该完成完整的用户注册到发帖流程', async () => {
      // 1. 注册新用户
      const newUserData = testUtils.createTestUser({
        username: 'integrationuser',
        email: 'integration@example.com'
      })
      
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(newUserData)
        .expect(201)
      
      const newAuthToken = registerResponse.body.data.token
      const newUserId = registerResponse.body.data.user.id
      
      // 2. 用户登录
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: newUserData.username,
          password: newUserData.password
        })
        .expect(200)
      
      expect(loginResponse.body.success).toBe(true)
      expect(loginResponse.body.data.token).toBeDefined()
      
      // 3. 获取用户信息
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${newAuthToken}`)
        .expect(200)
      
      expect(profileResponse.body.success).toBe(true)
      expect(profileResponse.body.data.username).toBe(newUserData.username)
      
      // 4. 搜索贴吧
      const searchResponse = await request(app)
        .get('/api/tiebas/search?q=测试')
        .set('Authorization', `Bearer ${newAuthToken}`)
        .expect(200)
      
      expect(searchResponse.body.success).toBe(true)
      expect(searchResponse.body.data.tiebas).toBeDefined()
      
      // 5. 加入贴吧
      const joinResponse = await request(app)
        .post(`/api/tiebas/${tiebaId}/join`)
        .set('Authorization', `Bearer ${newAuthToken}`)
        .expect(200)
      
      expect(joinResponse.body.success).toBe(true)
      
      // 6. 创建帖子
      const newPostData = testUtils.createTestPost({
        title: '集成测试帖子',
        content: '这是集成测试创建的帖子内容'
      })
      
      const createPostResponse = await request(app)
        .post(`/api/tiebas/${tiebaId}/posts`)
        .set('Authorization', `Bearer ${newAuthToken}`)
        .send(newPostData)
        .expect(201)
      
      expect(createPostResponse.body.success).toBe(true)
      const newPostId = createPostResponse.body.data._id
      
      // 7. 创建评论
      const commentData = testUtils.createTestComment({
        content: '集成测试评论'
      })
      
      const createCommentResponse = await request(app)
        .post(`/api/posts/${newPostId}/comments`)
        .set('Authorization', `Bearer ${newAuthToken}`)
        .send(commentData)
        .expect(201)
      
      expect(createCommentResponse.body.success).toBe(true)
      
      // 8. 发送私信
      const messageData = testUtils.createTestMessage({
        content: '集成测试私信'
      })
      
      const sendMessageResponse = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${newAuthToken}`)
        .send({
          ...messageData,
          receiver: userId
        })
        .expect(201)
      
      expect(sendMessageResponse.body.success).toBe(true)
      
      // 9. 更新用户资料
      const updateProfileResponse = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${newAuthToken}`)
        .send({
          nickname: '集成测试用户',
          bio: '这是集成测试的用户简介'
        })
        .expect(200)
      
      expect(updateProfileResponse.body.success).toBe(true)
      
      // 10. 退出登录
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${newAuthToken}`)
        .expect(200)
      
      expect(logoutResponse.body.success).toBe(true)
    })
  })

  describe('贴吧管理流程', () => {
    it('应该完成完整的贴吧创建到管理流程', async () => {
      // 1. 创建新贴吧
      const newTiebaData = testUtils.createTestTieba({
        name: '集成测试贴吧',
        description: '这是集成测试创建的贴吧'
      })
      
      const createTiebaResponse = await request(app)
        .post('/api/tiebas')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newTiebaData)
        .expect(201)
      
      expect(createTiebaResponse.body.success).toBe(true)
      const newTiebaId = createTiebaResponse.body.data._id
      
      // 2. 获取贴吧详情
      const tiebaDetailResponse = await request(app)
        .get(`/api/tiebas/${newTiebaId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      expect(tiebaDetailResponse.body.success).toBe(true)
      expect(tiebaDetailResponse.body.data.name).toBe(newTiebaData.name)
      
      // 3. 更新贴吧信息
      const updateTiebaResponse = await request(app)
        .put(`/api/tiebas/${newTiebaId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: '更新后的贴吧描述',
          rules: '新的贴吧规则'
        })
        .expect(200)
      
      expect(updateTiebaResponse.body.success).toBe(true)
      
      // 4. 获取贴吧成员列表
      const membersResponse = await request(app)
        .get(`/api/tiebas/${newTiebaId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      expect(membersResponse.body.success).toBe(true)
      expect(membersResponse.body.data.members).toBeDefined()
      
      // 5. 创建多个帖子
      const postsData = [
        testUtils.createTestPost({ title: '帖子一', content: '内容一' }),
        testUtils.createTestPost({ title: '帖子二', content: '内容二' }),
        testUtils.createTestPost({ title: '帖子三', content: '内容三' })
      ]
      
      for (const postData of postsData) {
        await request(app)
          .post(`/api/tiebas/${newTiebaId}/posts`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(postData)
          .expect(201)
      }
      
      // 6. 获取贴吧帖子列表
      const postsResponse = await request(app)
        .get(`/api/tiebas/${newTiebaId}/posts`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      expect(postsResponse.body.success).toBe(true)
      expect(postsResponse.body.data.posts).toHaveLength(3)
      
      // 7. 搜索帖子
      const searchPostsResponse = await request(app)
        .get(`/api/tiebas/${newTiebaId}/posts?search=帖子一`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      expect(searchPostsResponse.body.success).toBe(true)
      expect(searchPostsResponse.body.data.posts).toHaveLength(1)
      
      // 8. 删除贴吧
      const deleteTiebaResponse = await request(app)
        .delete(`/api/tiebas/${newTiebaId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      expect(deleteTiebaResponse.body.success).toBe(true)
    })
  })

  describe('消息与通知流程', () => {
    let receiverToken: string
    let receiverId: string
    
    beforeEach(async () => {
      // 创建接收者用户
      const receiverData = testUtils.createTestUser({
        username: 'receiver',
        email: 'receiver@example.com'
      })
      
      const receiverResponse = await request(app)
        .post('/api/auth/register')
        .send(receiverData)
      
      receiverToken = receiverResponse.body.data.token
      receiverId = receiverResponse.body.data.user.id
    })

    it('应该完成完整的消息发送到通知流程', async () => {
      // 1. 发送多条消息
      const messages = [
        testUtils.createTestMessage({ content: '消息一' }),
        testUtils.createTestMessage({ content: '消息二' }),
        testUtils.createTestMessage({ content: '消息三' })
      ]
      
      for (const messageData of messages) {
        await request(app)
          .post('/api/messages')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            ...messageData,
            receiver: receiverId
          })
          .expect(201)
      }
      
      // 2. 接收者获取收件箱
      const inboxResponse = await request(app)
        .get('/api/messages/inbox')
        .set('Authorization', `Bearer ${receiverToken}`)
        .expect(200)
      
      expect(inboxResponse.body.success).toBe(true)
      expect(inboxResponse.body.data.messages).toHaveLength(3)
      
      // 3. 获取未读消息数量
      const unreadCountResponse = await request(app)
        .get('/api/messages/unread-count')
        .set('Authorization', `Bearer ${receiverToken}`)
        .expect(200)
      
      expect(unreadCountResponse.body.success).toBe(true)
      expect(unreadCountResponse.body.data.count).toBe(3)
      
      // 4. 标记消息为已读
      const messageId = inboxResponse.body.data.messages[0]._id
      const markReadResponse = await request(app)
        .put(`/api/messages/${messageId}/read`)
        .set('Authorization', `Bearer ${receiverToken}`)
        .expect(200)
      
      expect(markReadResponse.body.success).toBe(true)
      
      // 5. 再次获取未读消息数量
      const updatedUnreadCountResponse = await request(app)
        .get('/api/messages/unread-count')
        .set('Authorization', `Bearer ${receiverToken}`)
        .expect(200)
      
      expect(updatedUnreadCountResponse.body.success).toBe(true)
      expect(updatedUnreadCountResponse.body.data.count).toBe(2)
      
      // 6. 发送者获取发件箱
      const outboxResponse = await request(app)
        .get('/api/messages/outbox')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      expect(outboxResponse.body.success).toBe(true)
      expect(outboxResponse.body.data.messages).toHaveLength(3)
      
      // 7. 搜索消息
      const searchResponse = await request(app)
        .get('/api/messages/inbox?search=消息一')
        .set('Authorization', `Bearer ${receiverToken}`)
        .expect(200)
      
      expect(searchResponse.body.success).toBe(true)
      expect(searchResponse.body.data.messages).toHaveLength(1)
      
      // 8. 删除消息
      const deleteMessageResponse = await request(app)
        .delete(`/api/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      expect(deleteMessageResponse.body.success).toBe(true)
      
      // 9. 获取通知设置
      const notificationSettingsResponse = await request(app)
        .get('/api/notifications/settings')
        .set('Authorization', `Bearer ${receiverToken}`)
        .expect(200)
      
      expect(notificationSettingsResponse.body.success).toBe(true)
      
      // 10. 更新通知设置
      const updateSettingsResponse = await request(app)
        .put('/api/notifications/settings')
        .set('Authorization', `Bearer ${receiverToken}`)
        .send({
          messageNotifications: false,
          systemNotifications: true
        })
        .expect(200)
      
      expect(updateSettingsResponse.body.success).toBe(true)
    })
  })

  describe('第三方服务集成流程', () => {
    it('应该测试第三方服务的集成流程', async () => {
      // 1. 测试通知服务
      const notificationStatusResponse = await request(app)
        .get('/api/notifications/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      expect(notificationStatusResponse.body.success).toBe(true)
      
      // 2. 测试地图服务
      const mapStatusResponse = await request(app)
        .get('/api/maps/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      expect(mapStatusResponse.body.success).toBe(true)
      
      // 3. 测试社交分享服务
      const socialStatusResponse = await request(app)
        .get('/api/social/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      expect(socialStatusResponse.body.success).toBe(true)
      
      // 4. 测试地理编码
      const geocodeResponse = await request(app)
        .post('/api/maps/geocode')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          address: '北京市海淀区中关村'
        })
        .expect(200)
      
      expect(geocodeResponse.body.success).toBe(true)
      
      // 5. 测试分享链接生成
      const shareResponse = await request(app)
        .post('/api/social/share')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '集成测试分享',
          content: '这是集成测试的分享内容',
          url: 'https://example.com/integration-test',
          platforms: ['weibo']
        })
        .expect(200)
      
      expect(shareResponse.body.success).toBe(true)
      
      // 6. 测试第三方服务健康检查
      const healthResponse = await request(app)
        .get('/api/health/third-party')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      expect(healthResponse.body.success).toBe(true)
    })
  })

  describe('错误处理与边界测试', () => {
    it('应该处理各种错误情况', async () => {
      // 1. 无效的认证令牌
      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)
      
      // 2. 不存在的资源
      await request(app)
        .get('/api/tiebas/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404)
      
      // 3. 无效的请求数据
      await request(app)
        .post('/api/auth/register')
        .send({
          username: '', // 无效的用户名
          email: 'invalid-email', // 无效的邮箱
          password: '123' // 过短的密码
        })
        .expect(400)
      
      // 4. 权限不足
      // 创建另一个用户
      const anotherUserData = testUtils.createTestUser({
        username: 'anotheruser',
        email: 'another@example.com'
      })
      
      const anotherUserResponse = await request(app)
        .post('/api/auth/register')
        .send(anotherUserData)
      
      const anotherAuthToken = anotherUserResponse.body.data.token
      
      // 尝试删除不属于自己的帖子
      await request(app)
        .delete(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${anotherAuthToken}`)
        .expect(403)
      
      // 5. 重复操作
      // 重复加入同一个贴吧
      await request(app)
        .post(`/api/tiebas/${tiebaId}/join`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400) // 应该返回错误，因为已经加入了
    })
  })

  describe('性能与并发测试', () => {
    it('应该处理并发请求', async () => {
      const concurrentRequests = 5
      const promises = []
      
      // 并发获取贴吧列表
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .get('/api/tiebas')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200)
        )
      }
      
      const responses = await Promise.all(promises)
      
      for (const response of responses) {
        expect(response.body.success).toBe(true)
      }
    })

    it('应该处理大量数据的分页', async () => {
      // 创建多个帖子
      const postCount = 25
      for (let i = 0; i < postCount; i++) {
        await request(app)
          .post(`/api/tiebas/${tiebaId}/posts`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(testUtils.createTestPost({ 
            title: `帖子 ${i + 1}`,
            content: `内容 ${i + 1}`
          }))
      }
      
      // 测试分页
      const page1Response = await request(app)
        .get(`/api/tiebas/${tiebaId}/posts?page=1&limit=10`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      expect(page1Response.body.success).toBe(true)
      expect(page1Response.body.data.posts).toHaveLength(10)
      expect(page1Response.body.data.pagination.total).toBe(postCount + 1) // +1 因为之前创建了一个帖子
      
      const page2Response = await request(app)
        .get(`/api/tiebas/${tiebaId}/posts?page=2&limit=10`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      expect(page2Response.body.success).toBe(true)
      expect(page2Response.body.data.posts).toHaveLength(10)
      
      const page3Response = await request(app)
        .get(`/api/tiebas/${tiebaId}/posts?page=3&limit=10`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      expect(page3Response.body.success).toBe(true)
      expect(page3Response.body.data.posts.length).toBeLessThanOrEqual(10)
    })
  })
})