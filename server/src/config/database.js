import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tieba', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })

    console.log(`✅ MongoDB连接成功: ${conn.connection.host}`)
    
    // 监听连接事件
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB连接错误:', err)
    })

    mongoose.connection.on('disconnected', () => {
      console.log('🔌 MongoDB连接断开')
    })

    // 优雅关闭
    process.on('SIGINT', async () => {
      await mongoose.connection.close()
      console.log('📦 MongoDB连接已关闭')
      process.exit(0)
    })

  } catch (error) {
    console.error('❌ MongoDB连接失败:', error.message)
    process.exit(1)
  }
}

// 数据库模型注册
const db = {
  User: null,
  Tieba: null,
  Post: null,
  Comment: null,
  File: null
}

// 动态导入模型
const loadModels = async () => {
  try {
    const { default: User } = await import('../models/User.js')
    const { default: Tieba } = await import('../models/Tieba.js')
    const { default: Post } = await import('../models/Post.js')
    const { default: Comment } = await import('../models/Comment.js')
    const { default: File } = await import('../models/File.js')
    
    db.User = User
    db.Tieba = Tieba
    db.Post = Post
    db.Comment = Comment
    db.File = File
    
    console.log('✅ 数据库模型加载完成')
  } catch (error) {
    console.error('❌ 数据库模型加载失败:', error)
  }
}

export { connectDB, loadModels, db }