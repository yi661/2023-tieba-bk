import mongoose from 'mongoose'

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, '帖子标题不能为空'],
    trim: true,
    minlength: [2, '帖子标题至少2个字符'],
    maxlength: [100, '帖子标题最多100个字符']
  },
  content: {
    type: String,
    required: [true, '帖子内容不能为空'],
    minlength: [1, '帖子内容至少1个字符'],
    maxlength: [10000, '帖子内容最多10000个字符']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tieba: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tieba',
    required: true
  },
  type: {
    type: String,
    enum: ['normal', 'announcement', 'sticky', 'essence'],
    default: 'normal'
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    thumbnail: String,
    alt: String,
    size: Number,
    width: Number,
    height: Number
  }],
  videos: [{
    url: String,
    thumbnail: String,
    duration: Number,
    size: Number
  }],
  tags: [{
    type: String,
    trim: true,
    maxlength: [10, '标签最多10个字符']
  }],
  likesCount: {
    type: Number,
    default: 0
  },
  commentsCount: {
    type: Number,
    default: 0
  },
  sharesCount: {
    type: Number,
    default: 0
  },
  viewsCount: {
    type: Number,
    default: 0
  },
  favoritesCount: {
    type: Number,
    default: 0
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  isApproved: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  lastCommentAt: {
    type: Date,
    default: Date.now
  },
  pinnedAt: {
    type: Date
  },
  essenceAt: {
    type: Date
  },
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  metadata: {
    wordCount: Number,
    imageCount: Number,
    videoCount: Number,
    readTime: Number // 阅读时间（分钟）
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// 虚拟字段：评论
postSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'post'
})

// 虚拟字段：点赞用户
postSchema.virtual('likes', {
  ref: 'Like',
  localField: '_id',
  foreignField: 'post'
})

// 虚拟字段：收藏用户
postSchema.virtual('favorites', {
  ref: 'Favorite',
  localField: '_id',
  foreignField: 'post'
})

// 增加浏览量
postSchema.methods.incrementViews = function() {
  this.viewsCount += 1
  return this.save()
}

// 更新最后评论时间
postSchema.methods.updateLastComment = function() {
  this.lastCommentAt = Date.now()
  return this.save()
}

// 计算阅读时间
postSchema.methods.calculateReadTime = function() {
  const wordsPerMinute = 200
  const wordCount = this.content.length
  this.metadata.readTime = Math.ceil(wordCount / wordsPerMinute)
  return this.save()
}

// 设置精华帖
postSchema.methods.setEssence = function() {
  this.type = 'essence'
  this.essenceAt = Date.now()
  return this.save()
}

// 取消精华帖
postSchema.methods.unsetEssence = function() {
  this.type = 'normal'
  this.essenceAt = undefined
  return this.save()
}

// 置顶帖子
postSchema.methods.pin = function() {
  this.type = 'sticky'
  this.pinnedAt = Date.now()
  return this.save()
}

// 取消置顶
postSchema.methods.unpin = function() {
  this.type = 'normal'
  this.pinnedAt = undefined
  return this.save()
}

// 静态方法：根据贴吧查找帖子
postSchema.statics.findByTieba = function(tiebaId, page = 1, limit = 20, type = 'all') {
  const skip = (page - 1) * limit
  let query = { tieba: tiebaId, isDeleted: false }
  
  if (type !== 'all') {
    query.type = type
  }
  
  return this.find(query)
    .sort({ pinnedAt: -1, essenceAt: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('author', 'username avatar level')
    .populate('tieba', 'name avatar')
}

// 静态方法：根据用户查找帖子
postSchema.statics.findByAuthor = function(authorId, page = 1, limit = 20) {
  const skip = (page - 1) * limit
  
  return this.find({ author: authorId, isDeleted: false })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('tieba', 'name avatar')
}

// 静态方法：搜索帖子
postSchema.statics.search = function(keyword, page = 1, limit = 20) {
  const skip = (page - 1) * limit
  const regex = new RegExp(keyword, 'i')
  
  return this.find({
    $and: [
      { isDeleted: false },
      {
        $or: [
          { title: regex },
          { content: regex },
          { tags: regex }
        ]
      }
    ]
  })
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit)
  .populate('author', 'username avatar level')
  .populate('tieba', 'name avatar')
}

// 静态方法：获取热门帖子
postSchema.statics.getHotPosts = function(limit = 10) {
  return this.find({ isDeleted: false })
    .sort({ 
      // 热门度计算：浏览量*0.3 + 点赞数*0.4 + 评论数*0.3
      $expr: {
        $add: [
          { $multiply: ['$viewsCount', 0.3] },
          { $multiply: ['$likesCount', 0.4] },
          { $multiply: ['$commentsCount', 0.3] }
        ]
      }
    })
    .limit(limit)
    .populate('author', 'username avatar level')
    .populate('tieba', 'name avatar')
}

// 索引优化
postSchema.index({ author: 1 })
postSchema.index({ tieba: 1 })
postSchema.index({ type: 1 })
postSchema.index({ createdAt: -1 })
postSchema.index({ lastCommentAt: -1 })
postSchema.index({ likesCount: -1 })
postSchema.index({ viewsCount: -1 })
postSchema.index({ title: 'text', content: 'text', tags: 'text' })

const Post = mongoose.model('Post', postSchema)

export default Post