import mongoose from 'mongoose'

const likeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  comment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  },
  type: {
    type: String,
    enum: ['post', 'comment'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

// 确保每个用户对同一内容只能点赞一次
likeSchema.index({ user: 1, post: 1 }, { 
  unique: true, 
  sparse: true,
  partialFilterExpression: { post: { $exists: true } }
})

likeSchema.index({ user: 1, comment: 1 }, { 
  unique: true, 
  sparse: true,
  partialFilterExpression: { comment: { $exists: true } }
})

// 复合索引优化查询性能
likeSchema.index({ post: 1, createdAt: -1 })
likeSchema.index({ comment: 1, createdAt: -1 })
likeSchema.index({ user: 1, createdAt: -1 })

// 静态方法：获取帖子的点赞用户列表
likeSchema.statics.getPostLikes = async function(postId, page = 1, limit = 20) {
  const skip = (page - 1) * limit
  
  const likes = await this.find({ post: postId })
    .populate('user', 'username avatar level')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)

  const total = await this.countDocuments({ post: postId })

  return {
    likes,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  }
}

// 静态方法：获取评论的点赞用户列表
likeSchema.statics.getCommentLikes = async function(commentId, page = 1, limit = 20) {
  const skip = (page - 1) * limit
  
  const likes = await this.find({ comment: commentId })
    .populate('user', 'username avatar level')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)

  const total = await this.countDocuments({ comment: commentId })

  return {
    likes,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  }
}

// 静态方法：获取用户的点赞历史
likeSchema.statics.getUserLikes = async function(userId, page = 1, limit = 20, type = 'all') {
  const skip = (page - 1) * limit
  
  let query = { user: userId }
  if (type !== 'all') {
    query.type = type
  }

  const likes = await this.find(query)
    .populate('post', 'title tieba')
    .populate('comment', 'content post')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)

  const total = await this.countDocuments(query)

  return {
    likes,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  }
}

// 静态方法：检查用户是否点赞了指定内容
likeSchema.statics.hasLiked = async function(userId, targetId, type) {
  const query = { user: userId }
  
  if (type === 'post') {
    query.post = targetId
  } else if (type === 'comment') {
    query.comment = targetId
  }

  return await this.exists(query)
}

// 静态方法：批量检查点赞状态
likeSchema.statics.batchCheckLikes = async function(userId, targetIds, type) {
  const query = { user: userId }
  
  if (type === 'post') {
    query.post = { $in: targetIds }
  } else if (type === 'comment') {
    query.comment = { $in: targetIds }
  }

  const likes = await this.find(query)
  
  const likedMap = {}
  likes.forEach(like => {
    const targetId = type === 'post' ? like.post.toString() : like.comment.toString()
    likedMap[targetId] = true
  })

  return likedMap
}

// 实例方法：获取点赞的详细信息
likeSchema.methods.getDetails = async function() {
  await this.populate('user', 'username avatar level')
  
  if (this.type === 'post') {
    await this.populate('post', 'title tieba')
  } else if (this.type === 'comment') {
    await this.populate('comment', 'content post')
  }

  return this
}

const Like = mongoose.model('Like', likeSchema)

export default Like