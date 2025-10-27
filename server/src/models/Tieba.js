import mongoose from 'mongoose'

const tiebaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '贴吧名称不能为空'],
    unique: true,
    trim: true,
    minlength: [2, '贴吧名称至少2个字符'],
    maxlength: [20, '贴吧名称最多20个字符'],
    match: [/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, '贴吧名称只能包含字母、数字、下划线和中文字符']
  },
  description: {
    type: String,
    required: [true, '贴吧描述不能为空'],
    maxlength: [500, '贴吧描述最多500个字符']
  },
  avatar: {
    type: String,
    default: '/images/default-tieba-avatar.png'
  },
  coverImage: {
    type: String,
    default: '/images/default-tieba-cover.jpg'
  },
  category: {
    type: String,
    required: [true, '贴吧分类不能为空'],
    enum: [
      '游戏', '动漫', '影视', '音乐', '体育', '科技', 
      '生活', '时尚', '汽车', '教育', '健康', '其他'
    ],
    default: '其他'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [10, '标签最多10个字符']
  }],
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  moderators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  membersCount: {
    type: Number,
    default: 0
  },
  postsCount: {
    type: Number,
    default: 0
  },
  todayPostsCount: {
    type: Number,
    default: 0
  },
  followersCount: {
    type: Number,
    default: 0
  },
  popularity: {
    type: Number,
    default: 0
  },
  isOfficial: {
    type: Boolean,
    default: false
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  joinRequirement: {
    type: String,
    enum: ['free', 'approval', 'invite'],
    default: 'free'
  },
  rules: [{
    title: {
      type: String,
      required: true,
      maxlength: [50, '规则标题最多50个字符']
    },
    content: {
      type: String,
      required: true,
      maxlength: [500, '规则内容最多500个字符']
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  announcement: {
    title: {
      type: String,
      maxlength: [100, '公告标题最多100个字符']
    },
    content: {
      type: String,
      maxlength: [1000, '公告内容最多1000个字符']
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  statistics: {
    dailyViews: { type: Number, default: 0 },
    weeklyViews: { type: Number, default: 0 },
    monthlyViews: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 }
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// 虚拟字段：成员关系
// 注意：这里我们使用虚拟字段来关联Member模型

// 增加成员数量
// 注意：实际成员关系在Member模型中维护，这里只统计数量

// 更新活跃时间
// 注意：当有新的帖子或回复时更新

// 更新今日帖子数量（每天重置）
tiebaSchema.methods.updateTodayPosts = function() {
  const now = new Date()
  const lastUpdate = this.lastActive || new Date(0)
  
  // 如果是新的一天，重置今日帖子数量
  if (now.toDateString() !== lastUpdate.toDateString()) {
    this.todayPostsCount = 0
  }
  
  this.todayPostsCount += 1
  this.lastActive = now
  return this.save()
}

// 更新人气值（基于成员数、帖子数、活跃度等计算）
tiebaSchema.methods.updatePopularity = function() {
  // 简单的权重计算
  const memberWeight = this.membersCount * 0.3
  const postWeight = this.postsCount * 0.4
  const activityWeight = this.todayPostsCount * 0.3
  
  this.popularity = Math.round(memberWeight + postWeight + activityWeight)
  return this.save()
}

// 静态方法：根据分类查找贴吧
tiebaSchema.statics.findByCategory = function(category, page = 1, limit = 20) {
  const skip = (page - 1) * limit
  
  return this.find({ category })
    .sort({ popularity: -1, membersCount: -1 })
    .skip(skip)
    .limit(limit)
    .populate('creator', 'username avatar level')
}

// 静态方法：搜索贴吧
tiebaSchema.statics.search = function(keyword, page = 1, limit = 20) {
  const skip = (page - 1) * limit
  const regex = new RegExp(keyword, 'i')
  
  return this.find({
    $or: [
      { name: regex },
      { description: regex },
      { tags: regex }
    ]
  })
  .sort({ popularity: -1, membersCount: -1 })
  .skip(skip)
  .limit(limit)
  .populate('creator', 'username avatar level')
}

// 静态方法：获取热门贴吧
tiebaSchema.statics.getPopular = function(limit = 10) {
  return this.find({})
    .sort({ popularity: -1, todayPostsCount: -1 })
    .limit(limit)
    .populate('creator', 'username avatar level')
}

// 索引优化
tiebaSchema.index({ name: 1 })
tiebaSchema.index({ category: 1 })
tiebaSchema.index({ popularity: -1 })
tiebaSchema.index({ membersCount: -1 })
tiebaSchema.index({ postsCount: -1 })
tiebaSchema.index({ createdAt: -1 })
tiebaSchema.index({ lastActive: -1 })

const Tieba = mongoose.model('Tieba', tiebaSchema)

export default Tieba