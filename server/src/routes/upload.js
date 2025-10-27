import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'
import { protect } from '../middleware/authMiddleware.js'
import File from '../models/File.js'

const router = express.Router()

// 确保上传目录存在
const uploadDir = path.join(process.cwd(), 'uploads')
const thumbnailsDir = path.join(uploadDir, 'thumbnails')

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}
if (!fs.existsSync(thumbnailsDir)) {
  fs.mkdirSync(thumbnailsDir, { recursive: true })
}

// 配置multer存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`
    cb(null, uniqueName)
  }
})

// 文件类型过滤
const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    'image/jpeg': true,
    'image/jpg': true,
    'image/png': true,
    'image/gif': true,
    'image/webp': true,
    'application/pdf': true,
    'text/plain': true,
    'application/msword': true,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true
  }

  if (allowedTypes[file.mimetype]) {
    cb(null, true)
  } else {
    cb(new Error('不支持的文件类型'), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10 // 最多10个文件
  }
})

// 单文件上传
router.post('/single', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件'
      })
    }

    const { originalname, mimetype, size, filename, path: filePath } = req.file
    
    // 生成缩略图（仅对图片）
    let thumbnailPath = null
    if (mimetype.startsWith('image/')) {
      const thumbnailFilename = `thumb_${filename}`
      thumbnailPath = path.join(thumbnailsDir, thumbnailFilename)
      
      await sharp(filePath)
        .resize(200, 200, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath)
    }

    // 保存文件信息到数据库
    const fileRecord = new File({
      filename: filename,
      originalName: originalname,
      mimetype: mimetype,
      size: size,
      path: filePath,
      thumbnailPath: thumbnailPath,
      uploadedBy: req.user.id,
      url: `/uploads/${filename}`,
      thumbnailUrl: thumbnailPath ? `/uploads/thumbnails/thumb_${filename}` : null
    })

    await fileRecord.save()

    res.status(201).json({
      success: true,
      message: '文件上传成功',
      data: {
        id: fileRecord._id,
        filename: fileRecord.filename,
        originalName: fileRecord.originalName,
        mimetype: fileRecord.mimetype,
        size: fileRecord.size,
        url: fileRecord.url,
        thumbnailUrl: fileRecord.thumbnailUrl,
        uploadedAt: fileRecord.uploadedAt
      }
    })

  } catch (error) {
    console.error('文件上传错误:', error)
    
    // 清理上传的文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }
    
    res.status(500).json({
      success: false,
      message: '文件上传失败'
    })
  }
})

// 多文件上传
router.post('/multiple', protect, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件'
      })
    }

    const uploadedFiles = []

    for (const file of req.files) {
      const { originalname, mimetype, size, filename, path: filePath } = file
      
      // 生成缩略图（仅对图片）
      let thumbnailPath = null
      if (mimetype.startsWith('image/')) {
        const thumbnailFilename = `thumb_${filename}`
        thumbnailPath = path.join(thumbnailsDir, thumbnailFilename)
        
        await sharp(filePath)
          .resize(200, 200, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 80 })
          .toFile(thumbnailPath)
      }

      // 保存文件信息到数据库
      const fileRecord = new File({
        filename: filename,
        originalName: originalname,
        mimetype: mimetype,
        size: size,
        path: filePath,
        thumbnailPath: thumbnailPath,
        uploadedBy: req.user.id,
        url: `/uploads/${filename}`,
        thumbnailUrl: thumbnailPath ? `/uploads/thumbnails/thumb_${filename}` : null
      })

      await fileRecord.save()

      uploadedFiles.push({
        id: fileRecord._id,
        filename: fileRecord.filename,
        originalName: fileRecord.originalName,
        mimetype: fileRecord.mimetype,
        size: fileRecord.size,
        url: fileRecord.url,
        thumbnailUrl: fileRecord.thumbnailUrl,
        uploadedAt: fileRecord.uploadedAt
      })
    }

    res.status(201).json({
      success: true,
      message: `成功上传 ${uploadedFiles.length} 个文件`,
      data: uploadedFiles
    })

  } catch (error) {
    console.error('多文件上传错误:', error)
    
    // 清理所有上传的文件
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path)
        }
      })
    }
    
    res.status(500).json({
      success: false,
      message: '文件上传失败'
    })
  }
})

// 获取文件列表
router.get('/files', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const skip = (page - 1) * limit

    const files = await File.find({ uploadedBy: req.user.id })
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('filename originalName mimetype size url thumbnailUrl uploadedAt')

    const total = await File.countDocuments({ uploadedBy: req.user.id })

    res.json({
      success: true,
      data: files,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('获取文件列表错误:', error)
    res.status(500).json({
      success: false,
      message: '获取文件列表失败'
    })
  }
})

// 删除文件
router.delete('/files/:fileId', protect, async (req, res) => {
  try {
    const { fileId } = req.params

    const file = await File.findOne({ _id: fileId, uploadedBy: req.user.id })
    if (!file) {
      return res.status(404).json({
        success: false,
        message: '文件不存在或无权删除'
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
    await File.findByIdAndDelete(fileId)

    res.json({
      success: true,
      message: '文件删除成功'
    })

  } catch (error) {
    console.error('删除文件错误:', error)
    res.status(500).json({
      success: false,
      message: '文件删除失败'
    })
  }
})

// 错误处理中间件
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: '文件大小超过限制'
      })
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: '文件数量超过限制'
      })
    }
  }

  if (error.message === '不支持的文件类型') {
    return res.status(400).json({
      success: false,
      message: error.message
    })
  }

  res.status(500).json({
    success: false,
    message: '上传过程中发生错误'
  })
})

export default router