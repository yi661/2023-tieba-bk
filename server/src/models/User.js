import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, '用户名不能为空'],
    unique: true,
    trim: true,
    minlength: [3, '用户名至少3个字符'],
    maxlength: [20, '用户名最多20个字符'],
    match: [/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, '用户名只能包含字母、数字、下划线和中文字符']
  },
  email: {
    type: String,
    required: [true, '邮箱不能为空'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, '请输入有效的邮箱地址']
  },
  password: {
    type: String,
    required: [true, '密码不能为空'],
    minlength: [6, '密码至少6个字符'],
    select: false // 查询时不返回密码字段
  },
  avatar: {
    type: String,
    default: '/images/default-avatar.png'
  },
  bio: {
    type: String,
    maxlength: [200, '个人简介最多200个字符'],
    default: ''
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'unknown'],
    default: 'unknown'
  },
  birthday: {
    type: Date
  },
  location: {
    type: String,
    maxlength: [50, '地区最多50个字符'],
    default: ''
  },
  level: {
    type: Number,
    default: 1,
    min: 1,
    max: 18
  },
  experience: {
    type: Number,
    default: 0
  },
  followersCount: {
    type: Number,
    default: 0
  },
  followingCount: {
    type: Number,
    default: 0
  },
  postsCount: {
    type: Number,
    default: 0
  },
  commentsCount: {
    type: Number,
    default: 0
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    }
  },
  socialLinks: {
    weibo: String,
    wechat: String,
    qq: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// 虚拟字段：关注关系
userSchema.virtual('followers', {
  ref: 'Follow',
  localField: '_id',
  foreignField: 'following'
})

userSchema.virtual('following', {
  ref: 'Follow',
  localField: '_id',
  foreignField: 'follower'
})

// 密码加密中间件
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next()
  }
  
  try {
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error)
  }
})

// 密码比较方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

// 生成JWT令牌
userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { 
      userId: this._id,
      username: this.username 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  )
}

// 更新最后登录时间
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = Date.now()
  return this.save()
}

// 增加经验值
userSchema.methods.addExperience = function(points) {
  this.experience += points
  
  // 计算等级（每1000经验升一级）
  const newLevel = Math.floor(this.experience / 1000) + 1
  if (newLevel > this.level && newLevel <= 18) {
    this.level = newLevel
  }
  
  return this.save()
}

// 静态方法：根据用户名或邮箱查找用户
userSchema.statics.findByUsernameOrEmail = function(identifier) {
  return this.findOne({
    $or: [
      { username: identifier },
      { email: identifier }
    ]
  })
}

// 索引优化
userSchema.index({ username: 1 })
userSchema.index({ email: 1 })
userSchema.index({ level: -1, experience: -1 })
userSchema.index({ createdAt: -1 })

const User = mongoose.model('User', userSchema)

export default User