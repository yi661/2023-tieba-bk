import mongoose from 'mongoose'

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, '评论内容不能为空'],
    trim: true,
    minlength: [1, '评论内容至少1个字符'],
    maxlength: [2000, '评论内容最多2000个字符']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    thumbnail: String,
    alt: String,
    size: Number
  }],
  likesCount: {
    type: Number,
    default: 0
  },
  repliesCount: {
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
  floor: {
    type: Number,
    required: true
  },
  ip: {
    type: String,
    select: false
  },
  userAgent: {
    type: String,
    select: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// 虚拟字段：回复评论
commentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parent'
})

// 虚拟字段：点赞用户
commentSchema.virtual('likes', {
  ref: 'Like',
  localField: '_id',
  foreignField: 'comment'
})

// 保存前设置楼层号
commentSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      // 查找该帖子的最新评论，获取最大楼层号
      const lastComment = await this.constructor
        .findOne({ post: this.post })
        .sort({ floor: -1 })
        
      this.floor = lastComment ? lastComment.floor + 1 : 1
      
      // 如果是回复评论，更新父评论的回复数
      if (this.parent) {
        await this.constructor.findByIdAndUpdate(
          this.parent,
          { $inc: { repliesCount: 1 } }
        )
      }
      
      // 更新帖子的评论数
      const Post = mongoose.model('Post')
      await Post.findByIdAndUpdate(
        this.post,
        { 
          $inc: { commentsCount: 1 },
          lastCommentAt: Date.now()
        }
      )
      
      next()
    } catch (error) {
      next(error)
    }
  } else {
    next()
  }
})

// 删除评论时的处理
commentSchema.pre('findOneAndDelete', async function(next) {
  try {
    const comment = await this.model.findOne(this.getQuery())
    
    if (comment) {
      // 更新帖子的评论数
      const Post = mongoose.model('Post')
      await Post.findByIdAndUpdate(
        comment.post,
        { $inc: { commentsCount: -1 } }
      )
      
      // 如果是回复评论，更新父评论的回复数
      if (comment.parent) {
        await this.model.findByIdAndUpdate(
          comment.parent,
          { $inc: { repliesCount: -1 } }
        )
      }
      
      // 删除所有子回复
      await this.model.deleteMany({ parent: comment._id })
    }
    
    next()
  } catch (error) {
    next(error)
  }
})

// 增加点赞数
commentSchema.methods.incrementLikes = function() {
  this.likesCount += 1
  return this.save()
}

// 减少点赞数
commentSchema.methods.decrementLikes = function() {
  this.likesCount = Math.max(0, this.likesCount - 1)
  return this.save()
}

// 静态方法：根据帖子查找评论
commentSchema.statics.findByPost = function(postId, page = 1, limit = 20, sortBy = 'floor') {
  const skip = (page - 1) * limit
  let sort = {}
  
  switch (sortBy) {
    case 'floor':
      sort = { floor: 1 } // 按楼层顺序
      break
    case 'likes':
      sort = { likesCount: -1 }
      break
    case 'time':
    default:
      sort = { createdAt: 1 }
      break
  }
  
  return this.find({ 
    post: postId, 
    parent: null, // 只获取顶级评论
    isDeleted: false 
  })
  .sort(sort)
  .skip(skip)
  .limit(limit)
  .populate('author', 'username avatar level')
  .populate('replyTo', 'username avatar')
}

// 静态方法：获取评论的回复
commentSchema.statics.findReplies = function(commentId, page = 1, limit = 10) {
  const skip = (page - 1) * limit
  
  return this.find({ 
    parent: commentId, 
    isDeleted: false 
  })
  .sort({ createdAt: 1 })
  .skip(skip)
  .limit(limit)
  .populate('author', 'username avatar level')
  .populate('replyTo', 'username avatar')
}

// 静态方法：根据用户查找评论
commentSchema.statics.findByAuthor = function(authorId, page = 1, limit = 20) {
  const skip = (page - 1) * limit
  
  return this.find({ 
    author: authorId, 
    isDeleted: false 
  })
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit)
  .populate('post', 'title')
  .populate('tieba', 'name')
}

// 索引优化
commentSchema.index({ author: 1 })
commentSchema.index({ post: 1 })
commentSchema.index({ parent: 1 })
commentSchema.index({ floor: 1 })
commentSchema.index({ createdAt: -1 })
commentSchema.index({ likesCount: -1 })
commentSchema.index({ content: 'text' })

const Comment = mongoose.model('Comment', commentSchema)

export default Comment