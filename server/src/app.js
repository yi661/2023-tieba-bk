import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'

// 导入路由
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import tiebaRoutes from './routes/tiebas.js'
import postRoutes from './routes/posts.js'
import commentRoutes from './routes/comments.js'
import fileRoutes from './routes/upload.js'
import likeRoutes from './routes/likes.js'
import favoriteRoutes from './routes/favorites.js'
import memberRoutes from './routes/members.js'
import notificationRoutes from './routes/notifications.js'
import mapRoutes from './routes/maps.js'
import socialRoutes from './routes/social.js'
import searchRoutes from './routes/search.js'
import uploadRoutes from './routes/upload.js'

// 导入中间件
import { errorHandler, notFound } from './middleware/errorMiddleware.js'
import { connectDB } from './config/database.js'

// 加载环境变量
dotenv.config()

const app = express()

// 连接数据库
connectDB()

// 安全中间件
app.use(helmet())
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}))

// 压缩中间件
app.use(compression())

// 日志中间件
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
} else {
  app.use(morgan('combined'))
}

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP最多100个请求
  message: {
    error: '请求过于频繁，请稍后再试',
    retryAfter: 900 // 15分钟后重试
  }
})

app.use('/api/', limiter)

// 解析请求体
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// 静态文件服务
app.use('/uploads', express.static('uploads'))

// API路由
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/tiebas', tiebaRoutes)
app.use('/api/posts', postRoutes)
app.use('/api/comments', commentRoutes)
app.use('/api/files', fileRoutes)
app.use('/api/likes', likeRoutes)
app.use('/api/favorites', favoriteRoutes)
app.use('/api/members', memberRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/maps', mapRoutes)
app.use('/api/social', socialRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/upload', uploadRoutes)

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  })
})

// API根端点
app.get('/api', (req, res) => {
  res.json({
    message: '百度贴吧API服务',
    version: '1.0.0',
   endpoints: {
    health: '/api/health',
    auth: '/api/auth',
    users: '/api/users',
    tiebas: '/api/tiebas',
    posts: '/api/posts',
    comments: '/api/comments',
    files: '/api/files',
    likes: '/api/likes',
    favorites: '/api/favorites',
    members: '/api/members',
    notifications: '/api/notifications',
    maps: '/api/maps',
    social: '/api/social',
    search: '/api/search',
    upload: '/api/upload'
  }  },
    documentation: '/api/docs'
  })
})

// 404处理
app.use(notFound)

// 错误处理
app.use(errorHandler)

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`)
  console.log(`📚 API文档: http://localhost:${PORT}/api`)
  console.log(`💊 健康检查: http://localhost:${PORT}/health`)
})

export default app