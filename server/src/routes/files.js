import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'
import File from '../models/File.js'
import { protect, admin } from '../middleware/authMiddleware.js'

const router = express.Router()

// 创建上传目录
const uploadDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// 配置multer存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const typeDir = path.join(uploadDir, file.fieldname)
    if (!fs.existsSync(typeDir)) {
      fs.mkdirSync(typeDir, { recursive: true })
    }
    cb(null, typeDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

// 文件类型过滤器
const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    videos: ['video/mp4', 'video/webm', 'video/ogg'],
    documents: ['application/pdf', 'text/plain', 'application/msword', 
               'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  }

  const fieldTypes = Object.keys(allowedTypes)
  const isValidType = fieldTypes.some(field => 
    allowedTypes[field].includes(file.mimetype)
  )

  if (isValidType) {
    cb(null, true)
  } else {
    cb(new Error(`不支持的文件类型: ${file.mimetype}`), false)
  }
}

// 配置multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10 // 最多10个文件
  }
})

// 单文件上传
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '请选择要上传的文件'
      })
    }

    const { originalname, mimetype, size, filename, path: filePath } = req.file
    const { description = '', tags = [] } = req.body

    // 生成缩略图（如果是图片）
    let thumbnailPath = null
    if (mimetype.startsWith('image/')) {
      const thumbnailName = 'thumb-' + filename
      thumbnailPath = path.join(path.dirname(filePath), thumbnailName)
      
      await sharp(filePath)
        .resize(200, 200, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath)
    }

    // 创建文件记录
    const file = await File.create({
      filename,
      originalName: originalname,
      mimetype,
      size,
      path: filePath,
      thumbnailPath,
      uploader: req.user._id,
      description,
      tags: Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim())
    })

    res.status(201).json({
      success: true,
      message: '文件上传成功',
      data: { file }
    })
  } catch (error) {
    console.error('文件上传错误:', error)
    
    // 删除已上传的文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }
    
    res.status(500).json({
      success: false,
      error: '文件上传失败'
    })
  }
})

// 多文件上传
router.post('/upload-multiple', protect, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请选择要上传的文件'
      })
    }

    const { description = '', tags = [] } = req.body
    const uploadedFiles = []

    for (const file of req.files) {
      const { originalname, mimetype, size, filename, path: filePath } = file

      // 生成缩略图（如果是图片）
      let thumbnailPath = null
      if (mimetype.startsWith('image/')) {
        const thumbnailName = 'thumb-' + filename
        thumbnailPath = path.join(path.dirname(filePath), thumbnailName)
        
        await sharp(filePath)
          .resize(200, 200, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 80 })
          .toFile(thumbnailPath)
      }

      // 创建文件记录
      const fileRecord = await File.create({
        filename,
        originalName: originalname,
        mimetype,
        size,
        path: filePath,
        thumbnailPath,
        uploader: req.user._id,
        description,
        tags: Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim())
      })

      uploadedFiles.push(fileRecord)
    }

    res.status(201).json({
      success: true,
      message: `成功上传 ${uploadedFiles.length} 个文件`,
      data: { files: uploadedFiles }
    })
  } catch (error) {
    console.error('多文件上传错误:', error)
    
    // 删除已上传的文件
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path)
        }
      })
    }
    
    res.status(500).json({
      success: false,
      error: '文件上传失败'
    })
  }
})

// 获取文件列表
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const type = req.query.type || 'all'
    const search = req.query.search || ''
    const uploaderId = req.query.uploader || ''

    const skip = (page - 1) * limit
    
    // 构建查询条件
    let query = {}
    
    if (type !== 'all') {
      if (type === 'images') {
        query.mimetype = { $regex: /^image\// }
      } else if (type === 'videos') {
        query.mimetype = { $regex: /^video\// }
      } else if (type === 'documents') {
        query.mimetype = { $regex: /^(application|text)\// }
      }
    }
    
    if (search) {
      const regex = new RegExp(search, 'i')
      query.$or = [
        { originalName: regex },
        { description: regex },
        { tags: regex }
      ]
    }
    
    if (uploaderId) {
      query.uploader = uploaderId
    }

    // 获取文件列表
    const files = await File.find(query)
      .populate('uploader', 'username avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    // 获取总数
    const total = await File.countDocuments(query)

    res.json({
      success: true,
      data: {
        files,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('获取文件列表错误:', error)
    res.status(500).json({
      success: false,
      error: '获取文件列表失败'
    })
  }
})

// 获取文件详情
router.get('/:id', protect, async (req, res) => {
  try {
    const file = await File.findById(req.params.id)
      .populate('uploader', 'username avatar')

    if (!file) {
      return res.status(404).json({
        success: false,
        error: '文件不存在'
      })
    }

    // 增加访问计数
    file.accessCount += 1
    await file.save()

    res.json({
      success: true,
      data: { file }
    })
  } catch (error) {
    console.error('获取文件详情错误:', error)
    res.status(500).json({
      success: false,
      error: '获取文件详情失败'
    })
  }
})

// 下载文件
router.get('/:id/download', protect, async (req, res) => {
  try {
    const file = await File.findById(req.params.id)

    if (!file) {
      return res.status(404).json({
        success: false,
        error: '文件不存在'
      })
    }

    // 检查文件是否存在
    if (!fs.existsSync(file.path)) {
      return res.status(404).json({
        success: false,
        error: '文件不存在或已被删除'
      })
    }

    // 增加下载计数
    file.downloadCount += 1
    await file.save()

    // 设置下载头
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`)
    res.setHeader('Content-Type', file.mimetype)

    // 发送文件
    const fileStream = fs.createReadStream(file.path)
    fileStream.pipe(res)
  } catch (error) {
    console.error('文件下载错误:', error)
    res.status(500).json({
      success: false,
      error: '文件下载失败'
    })
  }
})

// 预览文件（仅限图片和视频）
router.get('/:id/preview', protect, async (req, res) => {
  try {
    const file = await File.findById(req.params.id)

    if (!file) {
      return res.status(404).json({
        success: false,
        error: '文件不存在'
      })
    }

    // 检查文件类型是否支持预览
    if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
      return res.status(400).json({
        success: false,
        error: '不支持预览此文件类型'
      })
    }

    // 检查文件是否存在
    if (!fs.existsSync(file.path)) {
      return res.status(404).json({
        success: false,
        error: '文件不存在或已被删除'
      })
    }

    // 增加访问计数
    file.accessCount += 1
    await file.save()

    // 设置预览头
    res.setHeader('Content-Type', file.mimetype)

    // 发送文件
    const fileStream = fs.createReadStream(file.path)
    fileStream.pipe(res)
  } catch (error) {
    console.error('文件预览错误:', error)
    res.status(500).json({
      success: false,
      error: '文件预览失败'
    })
  }
})

// 获取缩略图
router.get('/:id/thumbnail', protect, async (req, res) => {
  try {
    const file = await File.findById(req.params.id)

    if (!file) {
      return res.status(404).json({
        success: false,
        error: '文件不存在'
      })
    }

    // 检查是否为图片
    if (!file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        error: '此文件类型不支持缩略图'
      })
    }

    // 检查缩略图是否存在
    if (!file.thumbnailPath || !fs.existsSync(file.thumbnailPath)) {
      // 如果缩略图不存在，生成新的缩略图
      const thumbnailName = 'thumb-' + file.filename
      file.thumbnailPath = path.join(path.dirname(file.path), thumbnailName)
      
      await sharp(file.path)
        .resize(200, 200, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toFile(file.thumbnailPath)
      
      await file.save()
    }

    // 设置缩略图头
    res.setHeader('Content-Type', 'image/jpeg')

    // 发送缩略图
    const thumbnailStream = fs.createReadStream(file.thumbnailPath)
    thumbnailStream.pipe(res)
  } catch (error) {
    console.error('获取缩略图错误:', error)
    res.status(500).json({
      success: false,
      error: '获取缩略图失败'
    })
  }
})

// 删除文件（需要管理员权限）
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const file = await File.findById(req.params.id)

    if (!file) {
      return res.status(404).json({
        success: false,
        error: '文件不存在'
      })
    }

    // 删除物理文件
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path)
    }
    
    if (file.thumbnailPath && fs.existsSync(file.thumbnailPath)) {
      fs.unlinkSync(file.thumbnailPath)
    }

    // 删除数据库记录
    await File.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: '文件删除成功'
    })
  } catch (error) {
    console.error('删除文件错误:', error)
    res.status(500).json({
      success: false,
      error: '文件删除失败'
    })
  }
})

// 清理未使用的文件（需要管理员权限）
router.post('/cleanup', protect, admin, async (req, res) => {
  try {
    const { days = 30 } = req.body
    
    // 查找指定天数内未被访问的文件
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const unusedFiles = await File.find({
      lastAccessed: { $lt: cutoffDate },
      accessCount: 0
    })

    let deletedCount = 0
    
    for (const file of unusedFiles) {
      // 删除物理文件
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path)
      }
      
      if (file.thumbnailPath && fs.existsSync(file.thumbnailPath)) {
        fs.unlinkSync(file.thumbnailPath)
      }

      // 删除数据库记录
      await File.findByIdAndDelete(file._id)
      deletedCount++
    }

    res.json({
      success: true,
      message: `成功清理 ${deletedCount} 个未使用文件`,
      data: { deletedCount }
    })
  } catch (error) {
    console.error('清理文件错误:', error)
    res.status(500).json({
      success: false,
      error: '文件清理失败'
    })
  }
})

export default router