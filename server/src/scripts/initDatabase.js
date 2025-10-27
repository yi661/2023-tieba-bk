import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import Tieba from '../models/Tieba.js'
import '../config/database.js'

// 初始化管理员用户
const createAdminUser = async () => {
  try {
    const adminExists = await User.findOne({ username: 'admin' })
    
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 12)
      
      const adminUser = new User({
        username: 'admin',
        email: 'admin@tieba.com',
        password: hashedPassword,
        role: 'admin',
        isVerified: true,
        profile: {
          displayName: '系统管理员',
          bio: '贴吧系统管理员',
          avatar: '/images/default-avatar.png'
        }
      })
      
      await adminUser.save()
      console.log('✅ 管理员用户创建成功')
    } else {
      console.log('ℹ️ 管理员用户已存在')
    }
  } catch (error) {
    console.error('❌ 创建管理员用户失败:', error)
  }
}

// 初始化示例贴吧
const createSampleTiebas = async () => {
  try {
    const sampleTiebas = [
      {
        name: '编程',
        description: '编程技术交流，分享学习经验',
        category: 'technology',
        tags: ['编程', '技术', '开发'],
        avatar: '/images/tieba-programming.png'
      },
      {
        name: '游戏',
        description: '游戏讨论，攻略分享',
        category: 'entertainment',
        tags: ['游戏', '娱乐', '攻略'],
        avatar: '/images/tieba-gaming.png'
      },
      {
        name: '学习',
        description: '学习交流，知识分享',
        category: 'education',
        tags: ['学习', '教育', '知识'],
        avatar: '/images/tieba-study.png'
      },
      {
        name: '音乐',
        description: '音乐分享，歌曲推荐',
        category: 'music',
        tags: ['音乐', '歌曲', '娱乐'],
        avatar: '/images/tieba-music.png'
      },
      {
        name: '电影',
        description: '电影讨论，影评分享',
        category: 'movie',
        tags: ['电影', '影视', '娱乐'],
        avatar: '/images/tieba-movie.png'
      }
    ]

    let createdCount = 0
    
    for (const tiebaData of sampleTiebas) {
      const existingTieba = await Tieba.findOne({ name: tiebaData.name })
      
      if (!existingTieba) {
        const tieba = new Tieba(tiebaData)
        await tieba.save()
        createdCount++
      }
    }
    
    if (createdCount > 0) {
      console.log(`✅ 创建了 ${createdCount} 个示例贴吧`)
    } else {
      console.log('ℹ️ 示例贴吧已存在')
    }
  } catch (error) {
    console.error('❌ 创建示例贴吧失败:', error)
  }
}

// 创建索引
const createIndexes = async () => {
  try {
    // 用户模型索引
    await User.collection.createIndex({ username: 1 }, { unique: true })
    await User.collection.createIndex({ email: 1 }, { unique: true })
    await User.collection.createIndex({ 'profile.displayName': 'text' })
    
    // 贴吧模型索引
    await Tieba.collection.createIndex({ name: 1 }, { unique: true })
    await Tieba.collection.createIndex({ category: 1 })
    await Tieba.collection.createIndex({ popularity: -1 })
    await Tieba.collection.createIndex({ name: 'text', description: 'text' })
    
    console.log('✅ 数据库索引创建成功')
  } catch (error) {
    console.error('❌ 创建数据库索引失败:', error)
  }
}

// 主初始化函数
const initDatabase = async () => {
  try {
    console.log('🚀 开始初始化数据库...')
    
    // 等待数据库连接
    if (mongoose.connection.readyState !== 1) {
      console.log('⏳ 等待数据库连接...')
      await new Promise(resolve => {
        mongoose.connection.on('connected', resolve)
      })
    }
    
    console.log('✅ 数据库连接成功')
    
    // 执行初始化任务
    await createIndexes()
    await createAdminUser()
    await createSampleTiebas()
    
    console.log('🎉 数据库初始化完成')
    
    // 退出进程
    process.exit(0)
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error)
    process.exit(1)
  }
}

// 处理进程信号
process.on('SIGINT', () => {
  console.log('\n🛑 收到中断信号，正在关闭数据库连接...')
  mongoose.connection.close(() => {
    console.log('✅ 数据库连接已关闭')
    process.exit(0)
  })
})

// 启动初始化
if (require.main === module) {
  initDatabase()
}

export default initDatabase