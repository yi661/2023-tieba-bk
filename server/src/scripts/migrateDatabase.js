import mongoose from 'mongoose'
import User from '../models/User.js'
import Tieba from '../models/Tieba.js'
import Post from '../models/Post.js'
import Comment from '../models/Comment.js'
import '../config/database.js'

// 数据库迁移版本管理
const migrations = [
  {
    version: '1.0.0',
    description: '初始版本迁移',
    up: async () => {
      console.log('🚀 执行版本 1.0.0 迁移...')
      
      // 添加用户经验值字段（如果不存在）
      const users = await User.find({})
      for (const user of users) {
        if (user.experience === undefined) {
          user.experience = 0
          user.level = 1
          await user.save()
        }
      }
      console.log('✅ 用户经验值字段迁移完成')
      
      // 添加贴吧人气值字段（如果不存在）
      const tiebas = await Tieba.find({})
      for (const tieba of tiebas) {
        if (tieba.popularity === undefined) {
          tieba.popularity = tieba.memberCount * 10 + tieba.postCount * 5
          await tieba.save()
        }
      }
      console.log('✅ 贴吧人气值字段迁移完成')
    }
  },
  {
    version: '1.1.0',
    description: '添加帖子阅读时间和标签字段',
    up: async () => {
      console.log('🚀 执行版本 1.1.0 迁移...')
      
      // 为帖子添加阅读时间字段
      const posts = await Post.find({})
      for (const post of posts) {
        if (post.readingTime === undefined) {
          // 根据内容长度计算阅读时间（假设每分钟阅读200字）
          const wordCount = post.content.length
          post.readingTime = Math.max(1, Math.ceil(wordCount / 200))
          await post.save()
        }
        
        // 确保tags字段存在
        if (!post.tags) {
          post.tags = []
          await post.save()
        }
      }
      console.log('✅ 帖子阅读时间和标签字段迁移完成')
    }
  },
  {
    version: '1.2.0',
    description: '添加评论楼层号和回复计数',
    up: async () => {
      console.log('🚀 执行版本 1.2.0 迁移...')
      
      // 为评论添加楼层号和回复计数
      const comments = await Comment.find({})
      
      // 按帖子分组处理楼层号
      const postComments = {}
      comments.forEach(comment => {
        const postId = comment.post.toString()
        if (!postComments[postId]) {
          postComments[postId] = []
        }
        postComments[postId].push(comment)
      })
      
      for (const postId in postComments) {
        const postCommentsList = postComments[postId]
          .filter(c => !c.parent) // 只处理顶级评论
          .sort((a, b) => a.createdAt - b.createdAt)
        
        for (let i = 0; i < postCommentsList.length; i++) {
          const comment = postCommentsList[i]
          if (comment.floorNumber === undefined) {
            comment.floorNumber = i + 1
            await comment.save()
          }
        }
      }
      
      // 计算回复计数
      for (const comment of comments) {
        if (comment.repliesCount === undefined) {
          const replyCount = await Comment.countDocuments({ 
            parent: comment._id,
            isDeleted: false 
          })
          comment.repliesCount = replyCount
          await comment.save()
        }
      }
      
      console.log('✅ 评论楼层号和回复计数迁移完成')
    }
  }
]

// 获取当前数据库版本
const getCurrentVersion = async () => {
  const versionDoc = await mongoose.connection.db.collection('migrations').findOne({})
  return versionDoc ? versionDoc.version : '0.0.0'
}

// 更新数据库版本
const updateVersion = async (version) => {
  await mongoose.connection.db.collection('migrations').updateOne(
    {},
    { $set: { version, updatedAt: new Date() } },
    { upsert: true }
  )
}

// 比较版本号
const compareVersions = (v1, v2) => {
  const parts1 = v1.split('.').map(Number)
  const parts2 = v2.split('.').map(Number)
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0
    const part2 = parts2[i] || 0
    
    if (part1 > part2) return 1
    if (part1 < part2) return -1
  }
  
  return 0
}

// 执行迁移
const runMigrations = async () => {
  try {
    console.log('🚀 开始数据库迁移...')
    
    // 等待数据库连接
    if (mongoose.connection.readyState !== 1) {
      console.log('⏳ 等待数据库连接...')
      await new Promise(resolve => {
        mongoose.connection.on('connected', resolve)
      })
    }
    
    console.log('✅ 数据库连接成功')
    
    // 获取当前版本
    const currentVersion = await getCurrentVersion()
    console.log(`📋 当前数据库版本: ${currentVersion}`)
    
    // 筛选需要执行的迁移
    const migrationsToRun = migrations.filter(migration => 
      compareVersions(migration.version, currentVersion) > 0
    )
    
    if (migrationsToRun.length === 0) {
      console.log('✅ 数据库已是最新版本，无需迁移')
      return
    }
    
    console.log(`📋 需要执行 ${migrationsToRun.length} 个迁移`)
    
    // 按版本顺序执行迁移
    for (const migration of migrationsToRun.sort((a, b) => 
      compareVersions(a.version, b.version)
    )) {
      console.log(`\n🎯 执行迁移 ${migration.version}: ${migration.description}`)
      
      try {
        await migration.up()
        await updateVersion(migration.version)
        console.log(`✅ 迁移 ${migration.version} 执行成功`)
      } catch (error) {
        console.error(`❌ 迁移 ${migration.version} 执行失败:`, error)
        throw error
      }
    }
    
    console.log('\n🎉 数据库迁移完成')
    
  } catch (error) {
    console.error('❌ 数据库迁移失败:', error)
    throw error
  }
}

// 回滚到指定版本
const rollbackToVersion = async (targetVersion) => {
  try {
    console.log(`🔄 开始回滚到版本 ${targetVersion}...`)
    
    // 获取当前版本
    const currentVersion = await getCurrentVersion()
    
    if (compareVersions(currentVersion, targetVersion) <= 0) {
      console.log('ℹ️ 当前版本已经等于或低于目标版本，无需回滚')
      return
    }
    
    // 筛选需要回滚的迁移（按版本倒序）
    const migrationsToRollback = migrations
      .filter(migration => 
        compareVersions(migration.version, targetVersion) > 0 &&
        compareVersions(migration.version, currentVersion) <= 0
      )
      .sort((a, b) => compareVersions(b.version, a.version))
    
    if (migrationsToRollback.length === 0) {
      console.log('ℹ️ 没有需要回滚的迁移')
      return
    }
    
    console.log(`📋 需要回滚 ${migrationsToRollback.length} 个迁移`)
    
    // 执行回滚（如果有down方法）
    for (const migration of migrationsToRollback) {
      console.log(`\n🔄 回滚迁移 ${migration.version}`)
      
      if (migration.down) {
        try {
          await migration.down()
          console.log(`✅ 迁移 ${migration.version} 回滚成功`)
        } catch (error) {
          console.error(`❌ 迁移 ${migration.version} 回滚失败:`, error)
        }
      } else {
        console.log(`ℹ️ 迁移 ${migration.version} 没有回滚方法，跳过`)
      }
    }
    
    // 更新版本号
    await updateVersion(targetVersion)
    console.log('\n✅ 数据库回滚完成')
    
  } catch (error) {
    console.error('❌ 数据库回滚失败:', error)
    throw error
  }
}

// 显示迁移状态
const showMigrationStatus = async () => {
  const currentVersion = await getCurrentVersion()
  const pendingMigrations = migrations.filter(migration => 
    compareVersions(migration.version, currentVersion) > 0
  )
  
  console.log('📊 数据库迁移状态:')
  console.log(`当前版本: ${currentVersion}`)
  console.log(`待执行迁移: ${pendingMigrations.length}`)
  
  if (pendingMigrations.length > 0) {
    console.log('\n待执行迁移列表:')
    pendingMigrations.forEach(migration => {
      console.log(`  ${migration.version}: ${migration.description}`)
    })
  }
}

// 处理命令行参数
const handleCommandLine = async () => {
  const command = process.argv[2]
  
  switch (command) {
    case 'migrate':
      await runMigrations()
      break
    case 'rollback':
      const targetVersion = process.argv[3] || '1.0.0'
      await rollbackToVersion(targetVersion)
      break
    case 'status':
      await showMigrationStatus()
      break
    default:
      console.log('使用方法:')
      console.log('  node migrateDatabase.js migrate    - 执行迁移')
      console.log('  node migrateDatabase.js rollback [version] - 回滚到指定版本')
      console.log('  node migrateDatabase.js status     - 显示迁移状态')
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

// 启动迁移
if (require.main === module) {
  handleCommandLine()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ 迁移执行失败:', error)
      process.exit(1)
    })
}

export { runMigrations, rollbackToVersion, showMigrationStatus }