// 404 错误处理
const notFound = (req, res, next) => {
  const error = new Error(`未找到 - ${req.originalUrl}`)
  res.status(404)
  next(error)
}

// 全局错误处理
const errorHandler = (err, req, res, next) => {
  let error = { ...err }
  error.message = err.message

  // 记录错误日志
  console.error('错误详情:', {
    消息: err.message,
    堆栈: err.stack,
    路径: req.path,
    方法: req.method,
    IP: req.ip,
    用户代理: req.get('User-Agent'),
    时间: new Date().toISOString()
  })

  // Mongoose 错误处理
  if (err.name === 'CastError') {
    const message = '资源未找到'
    error = { message, statusCode: 404 }
  }

  // Mongoose 重复键错误
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]
    const value = err.keyValue[field]
    const message = `${field} '${value}' 已存在`
    error = { message, statusCode: 400 }
  }

  // Mongoose 验证错误
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message)
    const message = `输入验证失败: ${messages.join(', ')}`
    error = { message, statusCode: 400 }
  }

  // JWT 错误
  if (err.name === 'JsonWebTokenError') {
    const message = '无效的令牌'
    error = { message, statusCode: 401 }
  }

  // JWT 过期错误
  if (err.name === 'TokenExpiredError') {
    const message = '令牌已过期'
    error = { message, statusCode: 401 }
  }

  // 文件上传错误
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = '文件大小超过限制'
    error = { message, statusCode: 413 }
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    const message = '文件数量超过限制'
    error = { message, statusCode: 413 }
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = '不支持的文件类型'
    error = { message, statusCode: 415 }
  }

  // 默认错误
  const statusCode = error.statusCode || err.statusCode || 500
  const message = error.message || '服务器内部错误'

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
}

// 异步错误处理包装器
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

// 验证错误处理
const validationError = (errors) => {
  return {
    success: false,
    error: '验证失败',
    details: errors.array().map(err => ({
      field: err.param,
      message: err.msg,
      value: err.value
    }))
  }
}

export { notFound, errorHandler, asyncHandler, validationError }