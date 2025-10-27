import mongoose from 'mongoose'

const fileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: [true, '文件名不能为空'],
    trim: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true,
    min: 0
  },
  path: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String
  },
  uploader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['image', 'video', 'audio', 'document', 'other'],
    required: true
  },
  category: {
    type: String,
    enum: ['avatar', 'cover', 'post', 'comment', 'attachment', 'other'],
    default: 'other'
  },
  width: {
    type: Number
  },
  height: {
    type: Number
  },
  duration: {
    type: Number // 视频/音频时长（秒）
  },
  metadata: {
    format: String,
    compression: String,
    quality: Number,
    exif: mongoose.Schema.Types.Mixed
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  accessCount: {
    type: Number,
    default: 0
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

// 增加访问计数
fileSchema.methods.incrementAccess = function() {
  this.accessCount += 1
  this.lastAccessed = Date.now()
  return this.save()
}

// 生成缩略图URL（如果适用）
fileSchema.methods.generateThumbnailUrl = function() {
  if (this.type === 'image' && !this.thumbnail) {
    // 简单的缩略图路径生成逻辑
    const parts = this.url.split('.')
    const extension = parts.pop()
    this.thumbnail = `${parts.join('.')}_thumb.${extension}`
  }
  return this.save()
}

// 静态方法：根据类型查找文件
fileSchema.statics.findByType = function(type, page = 1, limit = 20) {
  const skip = (page - 1) * limit
  
  return this.find({ type, isPublic: true })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('uploader', 'username avatar')
}

// 静态方法：根据上传者查找文件
fileSchema.statics.findByUploader = function(uploaderId, page = 1, limit = 20) {
  const skip = (page - 1) * limit
  
  return this.find({ uploader: uploaderId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
}

// 静态方法：清理未使用的文件
fileSchema.statics.cleanupUnusedFiles = async function(days = 30) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  
  // 查找超过指定天数且访问次数为0的文件
  const unusedFiles = await this.find({
    createdAt: { $lt: cutoffDate },
    accessCount: 0
  })
  
  // 这里可以添加实际的文件删除逻辑
  // 注意：需要先删除物理文件，再删除数据库记录
  
  return unusedFiles
}

// 索引优化
fileSchema.index({ uploader: 1 })
fileSchema.index({ type: 1 })
fileSchema.index({ category: 1 })
fileSchema.index({ createdAt: -1 })
fileSchema.index({ lastAccessed: -1 })
fileSchema.index({ isPublic: 1 })

const File = mongoose.model('File', fileSchema)

export default File