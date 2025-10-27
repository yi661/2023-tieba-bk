import request from 'supertest'
import fs from 'fs'
import path from 'path'
import app from '../app.js'
import User from '../models/User.js'
import File from '../models/File.js'
import Message from '../models/Message.js'
import { testUtils } from './setup.js'

describe('文件上传与消息系统', () => {
  let authToken: string
  let userId: string
  let receiverId: string
  let receiverToken: string
  
  beforeEach(async () => {
    // 注册并登录发送者用户
    const senderData = testUtils.createTestUser()
    const senderResponse = await request(app)
      .post('/api/auth/register')
      .send(senderData)
    
    authToken = senderResponse.body.data.token
    userId = senderResponse.body.data.user.id
    
    // 注册接收者用户
    const receiverData = testUtils.createTestUser({
      username: 'receiver',
      email: 'receiver@example.com'
    })
    const receiverResponse = await request(app)
      .post('/api/auth/register')
      .send(receiverData)
    
    receiverId = receiverResponse.body.data.user.id
    receiverToken = receiverResponse.body.data.token
  })

  describe('文件上传', () => {
    let testFilePath: string
    
    beforeEach(() => {
      // 创建测试文件
      testFilePath = path.join(__dirname, 'test-file.txt')
      fs.writeFileSync(testFilePath, '这是一个测试文件内容')
    })

    afterEach(() => {
      // 清理测试文件
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath)
      }
    })

    it('应该成功上传文件', async () => {
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFilePath)
        .field('description', '测试文件描述')
        .field('tags', '测试,文档')
        .expect(201)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.filename).toBe('test-file.txt')
      expect(response.body.data.size).toBeGreaterThan(0)
      expect(response.body.data.mimetype).toBe('text/plain')
      expect(response.body.data.uploader).toBe(userId)
      expect(response.body.data.description).toBe('测试文件描述')
      expect(response.body.data.tags).toEqual(['测试', '文档'])
      
      // 验证文件已保存到数据库
      const savedFile = await File.findOne({ filename: 'test-file.txt' })
      expect(savedFile).toBeTruthy()
      expect(savedFile?.description).toBe('测试文件描述')
    })

    it('应该拒绝未认证的文件上传', async () => {
      const response = await request(app)
        .post('/api/upload')
        .attach('file', testFilePath)
        .expect(401)
      
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('认证失败')
    })

    it('应该拒绝过大的文件', async () => {
      // 创建一个大文件
      const largeFilePath = path.join(__dirname, 'large-file.txt')
      const largeContent = 'x'.repeat(11 * 1024 * 1024) // 11MB
      fs.writeFileSync(largeFilePath, largeContent)
      
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', largeFilePath)
        .expect(413)
      
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('文件过大')
      
      // 清理大文件
      fs.unlinkSync(largeFilePath)
    })

    it('应该拒绝不支持的文件类型', async () => {
      // 创建不支持的文件类型
      const unsupportedFilePath = path.join(__dirname, 'test.exe')
      fs.writeFileSync(unsupportedFilePath, 'executable content')
      
      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', unsupportedFilePath)
        .expect(400)
      
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('不支持的文件类型')
      
      // 清理文件
      fs.unlinkSync(unsupportedFilePath)
    })

    it('应该支持多文件上传', async () => {
      // 创建第二个测试文件
      const testFile2Path = path.join(__dirname, 'test-file2.txt')
      fs.writeFileSync(testFile2Path, '第二个测试文件内容')
      
      const response = await request(app)
        .post('/api/upload/multiple')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('files', testFilePath)
        .attach('files', testFile2Path)
        .expect(201)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.files).toHaveLength(2)
      expect(response.body.data.files[0].filename).toBe('test-file.txt')
      expect(response.body.data.files[1].filename).toBe('test-file2.txt')
      
      // 清理第二个文件
      fs.unlinkSync(testFile2Path)
    })

    it('应该获取文件列表', async () => {
      // 先上传一个文件
      await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFilePath)
        .field('description', '测试文件')
      
      const response = await request(app)
        .get('/api/files')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.files).toHaveLength(1)
      expect(response.body.data.files[0].filename).toBe('test-file.txt')
      expect(response.body.data.pagination.total).toBe(1)
    })

    it('应该获取文件详情', async () => {
      // 先上传一个文件
      const uploadResponse = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFilePath)
        .field('description', '测试文件详情')
      
      const fileId = uploadResponse.body.data._id
      
      const response = await request(app)
        .get(`/api/files/${fileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data._id).toBe(fileId)
      expect(response.body.data.filename).toBe('test-file.txt')
      expect(response.body.data.description).toBe('测试文件详情')
    })

    it('应该删除文件', async () => {
      // 先上传一个文件
      const uploadResponse = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFilePath)
      
      const fileId = uploadResponse.body.data._id
      
      const response = await request(app)
        .delete(`/api/files/${fileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain('文件删除成功')
      
      // 验证文件已从数据库删除
      const deletedFile = await File.findById(fileId)
      expect(deletedFile).toBeNull()
    })
  })

  describe('消息系统', () => {
    it('应该成功发送私信', async () => {
      const messageData = testUtils.createTestMessage()
      
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...messageData,
          receiver: receiverId
        })
        .expect(201)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.content).toBe(messageData.content)
      expect(response.body.data.sender).toBe(userId)
      expect(response.body.data.receiver).toBe(receiverId)
      expect(response.body.data.type).toBe('private')
      
      // 验证消息已保存到数据库
      const savedMessage = await Message.findOne({ content: messageData.content })
      expect(savedMessage).toBeTruthy()
      expect(savedMessage?.sender.toString()).toBe(userId)
    })

    it('应该拒绝发送给自己', async () => {
      const messageData = testUtils.createTestMessage()
      
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...messageData,
          receiver: userId // 发送给自己
        })
        .expect(400)
      
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('不能给自己发送消息')
    })

    it('应该拒绝发送给不存在的用户', async () => {
      const messageData = testUtils.createTestMessage()
      const nonExistentUserId = '507f1f77bcf86cd799439011'
      
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...messageData,
          receiver: nonExistentUserId
        })
        .expect(404)
      
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('接收者不存在')
    })

    it('应该支持发送带附件的消息', async () => {
      // 先上传一个文件
      const testFilePath = path.join(__dirname, 'test-attachment.txt')
      fs.writeFileSync(testFilePath, '附件内容')
      
      const uploadResponse = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testFilePath)
      
      const fileId = uploadResponse.body.data._id
      
      const messageData = testUtils.createTestMessage()
      
      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...messageData,
          receiver: receiverId,
          attachments: [fileId]
        })
        .expect(201)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.attachments).toHaveLength(1)
      expect(response.body.data.attachments[0]).toBe(fileId)
      
      // 清理测试文件
      fs.unlinkSync(testFilePath)
    })

    it('应该获取收件箱消息', async () => {
      // 发送几条消息
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
      }
      
      // 接收者获取收件箱
      const response = await request(app)
        .get('/api/messages/inbox')
        .set('Authorization', `Bearer ${receiverToken}`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.messages).toHaveLength(3)
      expect(response.body.data.pagination.total).toBe(3)
      
      // 验证消息状态
      const message = response.body.data.messages[0]
      expect(message.receiver).toBe(receiverId)
      expect(message.isRead).toBe(false) // 默认未读
    })

    it('应该获取发件箱消息', async () => {
      // 发送几条消息
      const messages = [
        testUtils.createTestMessage({ content: '发件消息一' }),
        testUtils.createTestMessage({ content: '发件消息二' })
      ]
      
      for (const messageData of messages) {
        await request(app)
          .post('/api/messages')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            ...messageData,
            receiver: receiverId
          })
      }
      
      // 发送者获取发件箱
      const response = await request(app)
        .get('/api/messages/outbox')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.messages).toHaveLength(2)
      expect(response.body.data.pagination.total).toBe(2)
      
      // 验证消息状态
      const message = response.body.data.messages[0]
      expect(message.sender).toBe(userId)
    })

    it('应该标记消息为已读', async () => {
      // 发送一条消息
      const messageData = testUtils.createTestMessage()
      const sendResponse = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...messageData,
          receiver: receiverId
        })
      
      const messageId = sendResponse.body.data._id
      
      // 接收者标记为已读
      const response = await request(app)
        .put(`/api/messages/${messageId}/read`)
        .set('Authorization', `Bearer ${receiverToken}`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.isRead).toBe(true)
      expect(response.body.data.readAt).toBeDefined()
      
      // 验证数据库中的状态
      const updatedMessage = await Message.findById(messageId)
      expect(updatedMessage?.isRead).toBe(true)
      expect(updatedMessage?.readAt).toBeDefined()
    })

    it('应该获取未读消息数量', async () => {
      // 发送几条消息
      const messages = [
        testUtils.createTestMessage({ content: '未读消息一' }),
        testUtils.createTestMessage({ content: '未读消息二' })
      ]
      
      for (const messageData of messages) {
        await request(app)
          .post('/api/messages')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            ...messageData,
            receiver: receiverId
          })
      }
      
      // 接收者获取未读数量
      const response = await request(app)
        .get('/api/messages/unread-count')
        .set('Authorization', `Bearer ${receiverToken}`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.count).toBe(2)
    })

    it('应该删除消息', async () => {
      // 发送一条消息
      const messageData = testUtils.createTestMessage()
      const sendResponse = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...messageData,
          receiver: receiverId
        })
      
      const messageId = sendResponse.body.data._id
      
      // 发送者删除消息
      const response = await request(app)
        .delete(`/api/messages/${messageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain('消息删除成功')
      
      // 验证消息已从数据库删除
      const deletedMessage = await Message.findById(messageId)
      expect(deletedMessage).toBeNull()
    })

    it('应该支持消息搜索', async () => {
      // 发送几条包含特定关键词的消息
      const messages = [
        testUtils.createTestMessage({ content: '搜索测试消息一' }),
        testUtils.createTestMessage({ content: '搜索测试消息二' }),
        testUtils.createTestMessage({ content: '其他消息' })
      ]
      
      for (const messageData of messages) {
        await request(app)
          .post('/api/messages')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            ...messageData,
            receiver: receiverId
          })
      }
      
      // 搜索包含"搜索测试"的消息
      const response = await request(app)
        .get('/api/messages/inbox?search=搜索测试')
        .set('Authorization', `Bearer ${receiverToken}`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.messages).toHaveLength(2)
      expect(response.body.data.pagination.total).toBe(2)
    })

    it('应该支持消息分页', async () => {
      // 发送多条消息
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/messages')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            content: `消息${i}`,
            receiver: receiverId
          })
      }
      
      // 分页获取
      const response = await request(app)
        .get('/api/messages/inbox?page=1&limit=3')
        .set('Authorization', `Bearer ${receiverToken}`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.messages).toHaveLength(3)
      expect(response.body.data.pagination.total).toBe(5)
      expect(response.body.data.pagination.page).toBe(1)
      expect(response.body.data.pagination.limit).toBe(3)
    })
  })
})