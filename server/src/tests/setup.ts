import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'

let mongoServer: MongoMemoryServer

// 全局测试设置
beforeAll(async () => {
  // 启动内存MongoDB服务器
  mongoServer = await MongoMemoryServer.create()
  const mongoUri = mongoServer.getUri()
  
  // 连接到测试数据库
  await mongoose.connect(mongoUri)
  
  // 设置测试环境变量
  process.env.NODE_ENV = 'test'
  process.env.JWT_SECRET = 'test-jwt-secret'
  process.env.JWT_EXPIRE = '7d'
  process.env.MONGODB_URI = mongoUri
  process.env.REDIS_URL = 'redis://localhost:6379'
  process.env.PORT = '3001'
  
  // 禁用第三方服务以避免测试时调用外部API
  process.env.PUSH_SERVICE_ENABLED = 'false'
  process.env.MAP_SERVICE_ENABLED = 'false'
  process.env.SOCIAL_SHARE_ENABLED = 'false'
})

// 清理测试数据
afterEach(async () => {
  // 清理所有集合
  const collections = mongoose.connection.collections
  for (const key in collections) {
    const collection = collections[key]
    await collection.deleteMany({})
  }
})

// 关闭数据库连接
afterAll(async () => {
  await mongoose.connection.dropDatabase()
  await mongoose.connection.close()
  await mongoServer.stop()
})

// 测试工具函数
export const testUtils = {
  // 创建测试用户数据
  createTestUser: (overrides = {}) => ({
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    nickname: '测试用户',
    avatar: 'https://example.com/avatar.jpg',
    bio: '这是一个测试用户',
    ...overrides
  }),

  // 创建测试贴吧数据
  createTestTieba: (overrides = {}) => ({
    name: 'testtieba',
    title: '测试贴吧',
    description: '这是一个测试贴吧',
    avatar: 'https://example.com/tieba.jpg',
    banner: 'https://example.com/banner.jpg',
    category: 'test',
    tags: ['测试', '示例'],
    ...overrides
  }),

  // 创建测试帖子数据
  createTestPost: (overrides = {}) => ({
    title: '测试帖子',
    content: '这是一个测试帖子内容',
    images: ['https://example.com/image1.jpg'],
    tags: ['测试', '示例'],
    ...overrides
  }),

  // 创建测试评论数据
  createTestComment: (overrides = {}) => ({
    content: '这是一个测试评论',
    floor: 1,
    ...overrides
  }),

  // 创建测试消息数据
  createTestMessage: (overrides = {}) => ({
    content: '这是一个测试消息',
    type: 'private',
    ...overrides
  }),

  // 等待异步操作完成
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // 生成随机字符串
  randomString: (length = 10) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }
}

// 测试断言扩展
expect.extend({
  toBeValidObjectId(received) {
    const pass = mongoose.Types.ObjectId.isValid(received)
    return {
      message: () => `expected ${received} ${pass ? 'not to be' : 'to be'} a valid ObjectId`,
      pass
    }
  },

  toBeValidDate(received) {
    const pass = received instanceof Date && !isNaN(received.getTime())
    return {
      message: () => `expected ${received} ${pass ? 'not to be' : 'to be'} a valid Date`,
      pass
    }
  },

  toBeValidJWT(received) {
    const jwtRegex = /^[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+\\.[A-Za-z0-9-_]+$/
    const pass = typeof received === 'string' && jwtRegex.test(received)
    return {
      message: () => `expected ${received} ${pass ? 'not to be' : 'to be'} a valid JWT`,
      pass
    }
  }
})