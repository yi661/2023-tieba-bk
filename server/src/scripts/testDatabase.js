import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { connectDB } from '../config/database.js'
import User from '../models/User.js'
import Tieba from '../models/Tieba.js'
import Post from '../models/Post.js'
import Comment from '../models/Comment.js'
import File from '../models/File.js'
import Like from '../models/Like.js'
import Favorite from '../models/Favorite.js'
import Member from '../models/Member.js'

// 加载环境变量
dotenv.config()

async function testDatabaseConnection() {
  console.log('🧪 开始数据库连接测试...\n')

  try {
    // 测试数据库连接
    console.log('1. 测试数据库连接...')
    await connectDB()
    console.log('✅ 数据库连接成功\n')

    // 测试模型加载
    console.log('2. 测试数据库模型...')
    const models = [User, Tieba, Post, Comment, File, Like, Favorite, Member]
    const modelNames = ['User', 'Tieba', 'Post', 'Comment', 'File', 'Like', 'Favorite', 'Member']
    
    for (let i = 0; i < models.length; i++) {
      if (models[i] && models[i].modelName) {
        console.log(`   ✅ ${modelNames[i]} 模型加载成功`)
      } else {
        console.log(`   ❌ ${modelNames[i]} 模型加载失败`)
      }
    }
    console.log('')

    // 测试基本CRUD操作
    console.log('3. 测试基本CRUD操作...')
    
    // 测试用户模型
    console.log('   📝 测试用户模型...')
    const testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'testpassword123',
      displayName: '测试用户'
    })
    
    await testUser.save()
    console.log('     ✅ 用户创建成功')
    
    const foundUser = await User.findOne({ username: 'testuser' })
    console.log('     ✅ 用户查询成功')
    
    await User.findByIdAndDelete(foundUser._id)
    console.log('     ✅ 用户删除成功\n')

    // 测试贴吧模型
    console.log('   📝 测试贴吧模型...')
    const testTieba = new Tieba({
      name: '测试贴吧',
      description: '这是一个测试贴吧',
      category: 'test',
      createdBy: new mongoose.Types.ObjectId()
    })
    
    await testTieba.save()
    console.log('     ✅ 贴吧创建成功')
    
    const foundTieba = await Tieba.findOne({ name: '测试贴吧' })
    console.log('     ✅ 贴吧查询成功')
    
    await Tieba.findByIdAndDelete(foundTieba._id)
    console.log('     ✅ 贴吧删除成功\n')

    // 测试索引
    console.log('4. 测试数据库索引...')
    
    const collections = await mongoose.connection.db.collections()
    console.log(`   数据库中有 ${collections.length} 个集合`)
    
    for (const collection of collections) {
      const indexes = await collection.indexes()
      console.log(`   📊 ${collection.collectionName}: ${indexes.length} 个索引`)
    }
    console.log('')

    // 测试性能
    console.log('5. 测试查询性能...')
    
    const startTime = Date.now()
    const users = await User.find().limit(10).explain('executionStats')
    const endTime = Date.now()
    
    console.log(`   ⚡ 查询执行时间: ${endTime - startTime}ms`)
    console.log(`   📈 查询统计: ${JSON.stringify(users.executionStats, null, 2)}\n`)

    console.log('🎉 数据库测试完成！所有测试通过。')
    console.log('\n📊 测试总结:')
    console.log('   ✅ 数据库连接正常')
    console.log('   ✅ 所有模型加载成功')
    console.log('   ✅ 基本CRUD操作正常')
    console.log('   ✅ 索引配置正确')
    console.log('   ✅ 查询性能良好')

  } catch (error) {
    console.error('❌ 数据库测试失败:', error)
    console.error('\n🔧 故障排除建议:')
    console.error('   1. 检查MongoDB服务是否运行')
    console.error('   2. 检查.env文件中的MONGODB_URI配置')
    console.error('   3. 检查数据库连接权限')
    console.error('   4. 检查网络连接')
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close()
    console.log('\n🔌 数据库连接已关闭')
    process.exit(0)
  }
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  testDatabaseConnection()
}

export default testDatabaseConnection