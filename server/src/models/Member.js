import mongoose from 'mongoose'

const memberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tieba: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tieba',
    required: true
  },
  role: {
    type: String,
    enum: ['member', 'moderator', 'creator'],
    default: 'member'
  },
  joinDate: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  postCount: {
    type: Number,
    default: 0
  },
  commentCount: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  },
  experience: {
    type: Number,
    default: 0
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  banReason: {
    type: String,
    maxlength: 500
  },
  banUntil: {
    type: Date
  },
  notes: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
})

// 确保每个用户在同一个贴吧只能有一个成员记录
memberSchema.index({ user: 1, tieba: 1 }, { unique: true })

// 复合索引优化查询性能
memberSchema.index({ tieba: 1, role: 1, joinDate: -1 })
memberSchema.index({ user: 1, joinDate: -1 })
memberSchema.index({ tieba: 1, postCount: -1 })
memberSchema.index({ tieba: 1, lastActive: -1 })

// 静态方法：获取贴吧成员列表
memberSchema.statics.getTiebaMembers = async function(tiebaId, page = 1, limit = 20, role = 'all') {
  const skip = (page - 1) * limit
  
  let query = { tieba: tiebaId, isBanned: false }
  if (role !== 'all') {
    query.role = role
  }

  const members = await this.find(query)
    .populate('user', 'username avatar level experience')
    .sort({ role: 1, joinDate: -1 })
    .skip(skip)
    .limit(limit)

  const total = await this.countDocuments(query)

  return {
    members,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  }
}

// 静态方法：获取用户的贴吧列表
memberSchema.statics.getUserTiebas = async function(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit
  
  const members = await this.find({ user: userId, isBanned: false })
    .populate('tieba', 'name avatar description memberCount postCount todayPosts popularity')
    .sort({ lastActive: -1 })
    .skip(skip)
    .limit(limit)

  const total = await this.countDocuments({ user: userId, isBanned: false })

  return {
    members,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  }
}

// 静态方法：检查用户是否已加入贴吧
memberSchema.statics.isMember = async function(userId, tiebaId) {
  const member = await this.findOne({ 
    user: userId, 
    tieba: tiebaId,
    isBanned: false 
  })
  
  return {
    isMember: !!member,
    role: member ? member.role : null,
    isBanned: member ? member.isBanned : false
  }
}

// 静态方法：获取贴吧成员统计
memberSchema.statics.getTiebaStats = async function(tiebaId) {
  const stats = await this.aggregate([
    { $match: { tieba: mongoose.Types.ObjectId(tiebaId), isBanned: false } },
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 }
      }
    }
  ])

  const total = await this.countDocuments({ 
    tieba: tiebaId, 
    isBanned: false 
  })

  const roleStats = {}
  stats.forEach(stat => {
    roleStats[stat._id] = stat.count
  })

  return {
    total,
    roles: roleStats
  }
}

// 静态方法：获取活跃成员（最近7天有活动的）
memberSchema.statics.getActiveMembers = async function(tiebaId, days = 7, limit = 10) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  
  const members = await this.find({
    tieba: tiebaId,
    isBanned: false,
    lastActive: { $gte: cutoffDate }
  })
    .populate('user', 'username avatar level')
    .sort({ lastActive: -1 })
    .limit(limit)

  return members
}

// 静态方法：批量检查成员状态
memberSchema.statics.batchCheckMembership = async function(userId, tiebaIds) {
  const members = await this.find({ 
    user: userId, 
    tieba: { $in: tiebaIds },
    isBanned: false 
  })
  
  const membershipMap = {}
  members.forEach(member => {
    membershipMap[member.tieba.toString()] = {
      isMember: true,
      role: member.role
    }
  })

  return membershipMap
}

// 实例方法：更新最后活动时间
memberSchema.methods.updateLastActive = async function() {
  this.lastActive = new Date()
  await this.save()
}

// 实例方法：增加帖子计数
memberSchema.methods.incrementPostCount = async function() {
  this.postCount += 1
  this.experience += 10 // 发帖获得10点经验
  this.level = Math.floor(this.experience / 100) + 1 // 每100点经验升一级
  await this.save()
}

// 实例方法：增加评论计数
memberSchema.methods.incrementCommentCount = async function() {
  this.commentCount += 1
  this.experience += 2 // 评论获得2点经验
  this.level = Math.floor(this.experience / 100) + 1
  await this.save()
}

// 实例方法：封禁成员
memberSchema.methods.banMember = async function(reason, until) {
  this.isBanned = true
  this.banReason = reason
  this.banUntil = until
  await this.save()
}

// 实例方法：解封成员
memberSchema.methods.unbanMember = async function() {
  this.isBanned = false
  this.banReason = undefined
  this.banUntil = undefined
  await this.save()
}

// 实例方法：设置角色
memberSchema.methods.setRole = async function(role) {
  if (!['member', 'moderator', 'creator'].includes(role)) {
    throw new Error('无效的角色类型')
  }
  
  this.role = role
  await this.save()
}

// 实例方法：获取成员详细信息
memberSchema.methods.getDetails = async function() {
  await this.populate('user', 'username avatar level experience')
  await this.populate('tieba', 'name avatar description memberCount postCount todayPosts popularity')
  
  return this
}

const Member = mongoose.model('Member', memberSchema)

export default Member