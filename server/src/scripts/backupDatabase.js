import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

const execAsync = promisify(exec)

class DatabaseBackup {
  constructor() {
    this.backupDir = path.join(process.cwd(), 'backups')
    this.mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tieba'
    this.maxBackups = 10 // 最大备份数量
  }

  // 确保备份目录存在
  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true })
    }
  }

  // 获取备份文件名
  getBackupFilename() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    return `tieba-backup-${timestamp}.gz`
  }

  // 执行数据库备份
  async backup() {
    try {
      console.log('💾 开始数据库备份...')
      
      this.ensureBackupDir()
      
      const filename = this.getBackupFilename()
      const backupPath = path.join(this.backupDir, filename)
      
      // 使用mongodump进行备份
      const command = `mongodump --uri="${this.mongodbUri}" --archive="${backupPath}" --gzip`
      
      console.log(`执行命令: ${command}`)
      
      const { stdout, stderr } = await execAsync(command)
      
      if (stderr) {
        console.warn('备份警告:', stderr)
      }
      
      console.log(`✅ 数据库备份成功: ${filename}`)
      
      // 清理旧备份
      await this.cleanupOldBackups()
      
      return {
        success: true,
        filename: filename,
        path: backupPath,
        size: this.getFileSize(backupPath),
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      console.error('❌ 数据库备份失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 恢复数据库
  async restore(backupFilename) {
    try {
      console.log('🔄 开始数据库恢复...')
      
      const backupPath = path.join(this.backupDir, backupFilename)
      
      if (!fs.existsSync(backupPath)) {
        throw new Error(`备份文件不存在: ${backupFilename}`)
      }
      
      // 使用mongorestore进行恢复
      const command = `mongorestore --uri="${this.mongodbUri}" --archive="${backupPath}" --gzip --drop`
      
      console.log(`执行命令: ${command}`)
      
      const { stdout, stderr } = await execAsync(command)
      
      if (stderr) {
        console.warn('恢复警告:', stderr)
      }
      
      console.log(`✅ 数据库恢复成功: ${backupFilename}`)
      
      return {
        success: true,
        message: '数据库恢复成功'
      }
      
    } catch (error) {
      console.error('❌ 数据库恢复失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 获取备份列表
  async listBackups() {
    try {
      this.ensureBackupDir()
      
      const files = fs.readdirSync(this.backupDir)
      const backups = files
        .filter(file => file.endsWith('.gz') && file.startsWith('tieba-backup-'))
        .map(file => {
          const filePath = path.join(this.backupDir, file)
          const stats = fs.statSync(filePath)
          
          return {
            filename: file,
            path: filePath,
            size: this.getFileSize(filePath),
            created: stats.birthtime,
            modified: stats.mtime
          }
        })
        .sort((a, b) => new Date(b.created) - new Date(a.created))
      
      return backups
      
    } catch (error) {
      console.error('❌ 获取备份列表失败:', error)
      return []
    }
  }

  // 清理旧备份
  async cleanupOldBackups() {
    try {
      const backups = await this.listBackups()
      
      if (backups.length > this.maxBackups) {
        const backupsToDelete = backups.slice(this.maxBackups)
        
        for (const backup of backupsToDelete) {
          fs.unlinkSync(backup.path)
          console.log(`🗑️ 删除旧备份: ${backup.filename}`)
        }
        
        console.log(`✅ 已清理 ${backupsToDelete.length} 个旧备份`)
      }
      
    } catch (error) {
      console.error('❌ 清理旧备份失败:', error)
    }
  }

  // 获取文件大小（人类可读格式）
  getFileSize(filePath) {
    const stats = fs.statSync(filePath)
    const bytes = stats.size
    
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 获取数据库统计信息
  async getDatabaseStats() {
    try {
      const command = `mongo "${this.mongodbUri}" --eval "db.stats()" --quiet`
      const { stdout } = await execAsync(command)
      
      return JSON.parse(stdout)
      
    } catch (error) {
      console.error('❌ 获取数据库统计失败:', error)
      return null
    }
  }
}

// 命令行接口
async function main() {
  const backupManager = new DatabaseBackup()
  const command = process.argv[2]
  
  switch (command) {
    case 'backup':
      await backupManager.backup()
      break
      
    case 'restore':
      const filename = process.argv[3]
      if (!filename) {
        console.error('❌ 请指定要恢复的备份文件名')
        process.exit(1)
      }
      await backupManager.restore(filename)
      break
      
    case 'list':
      const backups = await backupManager.listBackups()
      console.log('📋 备份列表:')
      backups.forEach((backup, index) => {
        console.log(`${index + 1}. ${backup.filename} (${backup.size}) - ${backup.created.toLocaleString()}`)
      })
      break
      
    case 'stats':
      const stats = await backupManager.getDatabaseStats()
      if (stats) {
        console.log('📊 数据库统计:')
        console.log(`   数据库名: ${stats.db}`)
        console.log(`   集合数量: ${stats.collections}`)
        console.log(`   文档数量: ${stats.objects}`)
        console.log(`   数据大小: ${backupManager.getFileSize(stats.dataSize)}`)
        console.log(`   存储大小: ${backupManager.getFileSize(stats.storageSize)}`)
      }
      break
      
    case 'cleanup':
      await backupManager.cleanupOldBackups()
      break
      
    default:
      console.log('🔧 数据库备份工具')
      console.log('')
      console.log('使用方法:')
      console.log('  node backupDatabase.js backup    - 创建备份')
      console.log('  node backupDatabase.js restore <filename> - 恢复备份')
      console.log('  node backupDatabase.js list      - 列出备份')
      console.log('  node backupDatabase.js stats    - 数据库统计')
      console.log('  node backupDatabase.js cleanup  - 清理旧备份')
      break
  }
}

// 运行命令行接口
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export default DatabaseBackup