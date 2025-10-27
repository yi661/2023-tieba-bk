import request from 'supertest'
import app from '../app.js'
import User from '../models/User.js'
import Tieba from '../models/Tieba.js'
import Post from '../models/Post.js'
import Comment from '../models/Comment.js'
import { testUtils } from './setup.js'

describe('帖子与评论系统', () => {
  let authToken: string
  let userId: string
  let tiebaId: string
  
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
  })

  describe('帖子创建', () => {
    it('应该成功创建帖子', async () => {
      const postData = testUtils.createTestPost()
      
      const response = await request(app)
        .post(`/api/tiebas/${tiebaId}/posts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(postData)
        .expect(201)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.title).toBe(postData.title)
      expect(response.body.data.content).toBe(postData.content)
      expect(response.body.data.author).toBe(userId)
      expect(response.body.data.tieba).toBe(tiebaId)
      
      // 验证帖子已保存到数据库
      const savedPost = await Post.findOne({ title: postData.title })
      expect(savedPost).toBeTruthy()
      expect(savedPost?.content).toBe(postData.content)
    })

    it('应该拒绝无效的帖子数据', async () => {
      const invalidPostData = {
        title: '', // 标题为空
        content: 'ab' // 内容过短
      }
      
      const response = await request(app)
        .post(`/api/tiebas/${tiebaId}/posts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPostData)
        .expect(400)
      
      expect(response.body.success).toBe(false)
      expect(response.body.errors).toBeDefined()
    })

    it('应该拒绝在不存在的贴吧中创建帖子', async () => {
      const postData = testUtils.createTestPost()
      const nonExistentTiebaId = '507f1f77bcf86cd799439011'
      
      const response = await request(app)
        .post(`/api/tiebas/${nonExistentTiebaId}/posts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(postData)
        .expect(404)
      
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('贴吧不存在')
    })

    it('应该拒绝未加入贴吧的用户创建帖子', async () => {
      // 创建另一个用户
      const anotherUserData = testUtils.createTestUser({
        username: 'anotheruser',
        email: 'another@example.com'
      })
      
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(anotherUserData)
      
      const anotherAuthToken = registerResponse.body.data.token
      
      const postData = testUtils.createTestPost()
      
      const response = await request(app)
        .post(`/api/tiebas/${tiebaId}/posts`)
        .set('Authorization', `Bearer ${anotherAuthToken}`)
        .send(postData)
        .expect(403)
      
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('需要先加入贴吧才能发帖')
    })
  })

  describe('帖子列表获取', () => {
    beforeEach(async () => {
      // 创建几个测试帖子
      const posts = [
        testUtils.createTestPost({ title: '帖子一', content: '内容一' }),
        testUtils.createTestPost({ title: '帖子二', content: '内容二' }),
        testUtils.createTestPost({ title: '帖子三', content: '内容三' })
      ]
      
      for (const postData of posts) {
        await request(app)
          .post(`/api/tiebas/${tiebaId}/posts`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(postData)
      }
    })

    it('应该成功获取帖子列表', async () => {
      const response = await request(app)
        .get(`/api/tiebas/${tiebaId}/posts`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.posts).toHaveLength(3)
      expect(response.body.data.pagination.total).toBe(3)
      expect(response.body.data.pagination.page).toBe(1)
      expect(response.body.data.pagination.limit).toBe(20)
    })

    it('应该支持分页查询', async () => {
      const response = await request(app)
        .get(`/api/tiebas/${tiebaId}/posts?page=1&limit=2`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.posts).toHaveLength(2)
      expect(response.body.data.pagination.total).toBe(3)
      expect(response.body.data.pagination.page).toBe(1)
      expect(response.body.data.pagination.limit).toBe(2)
    })

    it('应该支持搜索功能', async () => {
      const response = await request(app)
        .get(`/api/tiebas/${tiebaId}/posts?search=帖子一`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.posts).toHaveLength(1)
      expect(response.body.data.posts[0].title).toBe('帖子一')
    })

    it('应该支持排序功能', async () => {
      const response = await request(app)
        .get(`/api/tiebas/${tiebaId}/posts?sort=createdAt&order=desc`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.posts).toHaveLength(3)
    })
  })

  describe('帖子详情获取', () => {
    let postId: string
    
    beforeEach(async () => {
      // 创建一个测试帖子
      const postData = testUtils.createTestPost()
      const createResponse = await request(app)
        .post(`/api/tiebas/${tiebaId}/posts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(postData)
      
      postId = createResponse.body.data._id
    })

    it('应该成功获取帖子详情', async () => {
      const response = await request(app)
        .get(`/api/posts/${postId}`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data._id).toBe(postId)
      expect(response.body.data.title).toBe('测试帖子')
      expect(response.body.data.content).toBe('这是一个测试帖子内容')
    })

    it('应该增加阅读次数', async () => {
      // 第一次获取
      const firstResponse = await request(app)
        .get(`/api/posts/${postId}`)
        .expect(200)
      
      const firstReadCount = firstResponse.body.data.readCount
      
      // 第二次获取
      const secondResponse = await request(app)
        .get(`/api/posts/${postId}`)
        .expect(200)
      
      expect(secondResponse.body.data.readCount).toBe(firstReadCount + 1)
    })

    it('应该返回不存在的帖子错误', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011'
      
      const response = await request(app)
        .get(`/api/posts/${nonExistentId}`)
        .expect(404)
      
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('帖子不存在')
    })
  })

  describe('帖子信息更新', () => {
    let postId: string
    
    beforeEach(async () => {
      // 创建一个测试帖子
      const postData = testUtils.createTestPost()
      const createResponse = await request(app)
        .post(`/api/tiebas/${tiebaId}/posts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(postData)
      
      postId = createResponse.body.data._id
    })

    it('应该成功更新帖子信息', async () => {
      const updateData = {
        title: '更新后的帖子标题',
        content: '更新后的帖子内容',
        tags: ['更新', '测试']
      }
      
      const response = await request(app)
        .put(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.title).toBe(updateData.title)
      expect(response.body.data.content).toBe(updateData.content)
      expect(response.body.data.tags).toEqual(updateData.tags)
    })

    it('应该拒绝非作者的更新请求', async () => {
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
        .put(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${anotherAuthToken}`)
        .send(updateData)
        .expect(403)
      
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('没有权限修改此帖子')
    })
  })

  describe('帖子删除', () => {
    let postId: string
    
    beforeEach(async () => {
      // 创建一个测试帖子
      const postData = testUtils.createTestPost()
      const createResponse = await request(app)
        .post(`/api/tiebas/${tiebaId}/posts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(postData)
      
      postId = createResponse.body.data._id
    })

    it('应该成功删除帖子', async () => {
      const response = await request(app)
        .delete(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain('帖子删除成功')
      
      // 验证帖子已从数据库删除
      const deletedPost = await Post.findById(postId)
      expect(deletedPost).toBeNull()
    })

    it('应该拒绝非作者的删除请求', async () => {
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
        .delete(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${anotherAuthToken}`)
        .expect(403)
      
      expect(response.body.success).toBe(false)
      expect(response.body.message).toContain('没有权限删除此帖子')
    })
  })

  describe('评论系统', () => {
    let postId: string
    
    beforeEach(async () => {
      // 创建一个测试帖子
      const postData = testUtils.createTestPost()
      const createResponse = await request(app)
        .post(`/api/tiebas/${tiebaId}/posts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(postData)
      
      postId = createResponse.body.data._id
    })

    it('应该成功创建评论', async () => {
      const commentData = testUtils.createTestComment()
      
      const response = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(commentData)
        .expect(201)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.content).toBe(commentData.content)
      expect(response.body.data.author).toBe(userId)
      expect(response.body.data.post).toBe(postId)
      expect(response.body.data.floor).toBe(1)
      
      // 验证评论已保存到数据库
      const savedComment = await Comment.findOne({ content: commentData.content })
      expect(savedComment).toBeTruthy()
      expect(savedComment?.floor).toBe(1)
    })

    it('应该自动分配楼层号', async () => {
      // 创建第一个评论
      await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(testUtils.createTestComment({ content: '评论一' }))
      
      // 创建第二个评论
      const response = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(testUtils.createTestComment({ content: '评论二' }))
      
      expect(response.body.data.floor).toBe(2)
    })

    it('应该支持回复评论', async () => {
      // 创建父评论
      const parentCommentResponse = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(testUtils.createTestComment({ content: '父评论' }))
      
      const parentCommentId = parentCommentResponse.body.data._id
      
      // 回复父评论
      const replyData = {
        content: '回复评论',
        parent: parentCommentId
      }
      
      const response = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(replyData)
        .expect(201)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.content).toBe(replyData.content)
      expect(response.body.data.parent).toBe(parentCommentId)
    })

    it('应该获取评论列表', async () => {
      // 创建几个测试评论
      const comments = [
        testUtils.createTestComment({ content: '评论一' }),
        testUtils.createTestComment({ content: '评论二' }),
        testUtils.createTestComment({ content: '评论三' })
      ]
      
      for (const commentData of comments) {
        await request(app)
          .post(`/api/posts/${postId}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(commentData)
      }
      
      const response = await request(app)
        .get(`/api/posts/${postId}/comments`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.comments).toHaveLength(3)
      expect(response.body.data.pagination.total).toBe(3)
    })

    it('应该支持评论分页', async () => {
      // 创建多个评论
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post(`/api/posts/${postId}/comments`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(testUtils.createTestComment({ content: `评论${i}` }))
      }
      
      const response = await request(app)
        .get(`/api/posts/${postId}/comments?page=1&limit=3`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.comments).toHaveLength(3)
      expect(response.body.data.pagination.total).toBe(5)
      expect(response.body.data.pagination.page).toBe(1)
      expect(response.body.data.pagination.limit).toBe(3)
    })

    it('应该删除评论', async () => {
      // 创建一个评论
      const createResponse = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(testUtils.createTestComment())
      
      const commentId = createResponse.body.data._id
      
      // 删除评论
      const response = await request(app)
        .delete(`/api/comments/${commentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain('评论删除成功')
      
      // 验证评论已从数据库删除
      const deletedComment = await Comment.findById(commentId)
      expect(deletedComment).toBeNull()
    })
  })
})