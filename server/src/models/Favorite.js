import mongoose from 'mongoose'

const favoriteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  folder: {
    type: String,
    default: 'default'
  },
  tags: [{
    type: String,
    trim: true
  }],
  notes: {
    type: String,
    maxlength: 500
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

// 确保每个用户对同一帖子只能收藏一次
favoriteSchema.index({ user: 1, post: 1 }, { unique: true })

// 复合索引优化查询性能
favoriteSchema.index({ user: 1, folder: 1, createdAt: -1 })
favoriteSchema.index({ post: 1, createdAt: -1 })
favoriteSchema.index({ user: 1, tags: 1 })

// 静态方法：获取用户的收藏列表
favoriteSchema.statics.getUserFavorites = async function(userId, page = 1, limit = 20, folder = 'all') {
  const skip = (page - 1) * limit
  
  let query = { user: userId }
  if (folder !== 'all') {
    query.folder = folder
  }

  const favorites = await this.find(query)
    .populate('post', 'title content author tieba viewsCount likesCount commentsCount createdAt')
    .populate('post.author', 'username avatar level')
    .populate('post.tieba', 'name avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)

  const total = await this.countDocuments(query)

  return {
    favorites,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  }
}

// 静态方法：获取帖子的收藏用户列表
favoriteSchema.statics.getPostFavorites = async function(postId, page = 1, limit = 20) {
  const skip = (page - 1) * limit
  
  const favorites = await this.find({ post: postId })
    .populate('user', 'username avatar level')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)

  const total = await this.countDocuments({ post: postId })

  return {
    favorites,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  }
}

// 静态方法：检查用户是否收藏了指定帖子
favoriteSchema.statics.hasFavorited = async function(userId, postId) {
  return await this.exists({ user: userId, post: postId })
}

// 静态方法：批量检查收藏状态
favoriteSchema.statics.batchCheckFavorites = async function(userId, postIds) {
  const favorites = await this.find({ 
    user: userId, 
    post: { $in: postIds } 
  })
  
  const favoritedMap = {}
  favorites.forEach(favorite => {
    favoritedMap[favorite.post.toString()] = true
  })

  return favoritedMap
}

// 静态方法：获取用户的收藏统计
favoriteSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$folder',
        count: { $sum: 1 }
      }
    }
  ])

  const total = await this.countDocuments({ user: userId })
  
  const folderStats = {}
  stats.forEach(stat => {
    folderStats[stat._id] = stat.count
  })

  return {
    total,
    folders: folderStats
  }
}

// 静态方法：获取用户的收藏文件夹列表
favoriteSchema.statics.getUserFolders = async function(userId) {
  const folders = await this.distinct('folder', { user: userId })
  return folders
}

// 静态方法：按标签搜索收藏
favoriteSchema.statics.searchByTags = async function(userId, tags, page = 1, limit = 20) {
  const skip = (page - 1) * limit
  
  const favorites = await this.find({ 
    user: userId, 
    tags: { $in: tags } 
  })
    .populate('post', 'title content author tieba viewsCount likesCount commentsCount createdAt')
    .populate('post.author', 'username avatar level')
    .populate('post.tieba', 'name avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)

  const total = await this.countDocuments({ 
    user: userId, 
    tags: { $in: tags } 
  })

  return {
    favorites,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  }
}

// 实例方法：更新收藏信息
favoriteSchema.methods.updateInfo = async function(folder, tags, notes) {
  if (folder) this.folder = folder
  if (tags) this.tags = tags
  if (notes !== undefined) this.notes = notes
  
  await this.save()
  return this
}

// 实例方法：获取收藏的详细信息
favoriteSchema.methods.getDetails = async function() {
  await this.populate('user', 'username avatar level')
  await this.populate('post', 'title content author tieba viewsCount likesCount commentsCount createdAt')
  await this.populate('post.author', 'username avatar level')
  await this.populate('post.tieba', 'name avatar')
  
  return this
}

const Favorite = mongoose.model('Favorite', favoriteSchema)

export default Favorite