import axios from 'axios'

class SocialShareService {
  constructor() {
    this.weiboAppKey = process.env.WEIBO_APP_KEY || ''
    this.weiboAppSecret = process.env.WEIBO_APP_SECRET || ''
    this.qqAppKey = process.env.QQ_APP_KEY || ''
    this.qqAppSecret = process.env.QQ_APP_SECRET || ''
    this.wechatAppId = process.env.WECHAT_APP_ID || ''
    this.wechatAppSecret = process.env.WECHAT_APP_SECRET || ''
    
    this.isWeiboEnabled = !!(this.weiboAppKey && this.weiboAppSecret)
    this.isQQEnabled = !!(this.qqAppKey && this.qqAppSecret)
    this.isWechatEnabled = !!(this.wechatAppId && this.wechatAppSecret)
  }

  // 生成分享链接
  generateShareUrl(type, content, options = {}) {
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000'
    
    switch (type) {
      case 'post':
        return `${baseUrl}/post/${content.id}`
      case 'tieba':
        return `${baseUrl}/tieba/${content.id}`
      case 'user':
        return `${baseUrl}/user/${content.id}`
      default:
        return baseUrl
    }
  }

  // 微博分享
  async shareToWeibo(content, accessToken = '') {
    try {
      if (!this.isWeiboEnabled) {
        throw new Error('微博分享服务未配置')
      }

      const shareUrl = this.generateShareUrl(content.type, content)
      const text = `${content.title || content.description}\n${shareUrl}`

      // 如果有accessToken，使用API分享
      if (accessToken) {
        const response = await axios.post('https://api.weibo.com/2/statuses/share.json', {
          access_token: accessToken,
          status: text
        })

        return {
          success: true,
          platform: 'weibo',
          shareId: response.data.id,
          url: `https://weibo.com/${response.data.user.id}/status/${response.data.id}`,
          timestamp: new Date().toISOString()
        }
      } else {
        // 生成分享链接
        const shareLink = `http://service.weibo.com/share/share.php?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(content.title || '')}&pic=${encodeURIComponent(content.image || '')}`
        
        return {
          success: true,
          platform: 'weibo',
          type: 'link',
          url: shareLink,
          instructions: '请在新窗口打开链接完成分享'
        }
      }

    } catch (error) {
      console.error('微博分享失败:', error)
      return {
        success: false,
        platform: 'weibo',
        error: error.message
      }
    }
  }

  // QQ空间分享
  async shareToQZone(content) {
    try {
      const shareUrl = this.generateShareUrl(content.type, content)
      
      // 生成QQ空间分享链接
      const shareLink = `https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(content.title || '')}&desc=${encodeURIComponent(content.description || '')}&pics=${encodeURIComponent(content.image || '')}`
      
      return {
        success: true,
        platform: 'qzone',
        type: 'link',
        url: shareLink,
        instructions: '请在新窗口打开链接完成分享'
      }

    } catch (error) {
      console.error('QQ空间分享失败:', error)
      return {
        success: false,
        platform: 'qzone',
        error: error.message
      }
    }
  }

  // 微信分享（需要前端SDK）
  async shareToWechat(content, type = 'timeline') {
    try {
      if (!this.isWechatEnabled) {
        throw new Error('微信分享服务未配置')
      }

      const shareUrl = this.generateShareUrl(content.type, content)
      
      // 微信分享需要前端SDK配合，这里返回配置信息
      return {
        success: true,
        platform: 'wechat',
        type: type,
        config: {
          title: content.title || '',
          desc: content.description || '',
          link: shareUrl,
          imgUrl: content.image || '',
          success: function() {
            console.log('微信分享成功')
          },
          cancel: function() {
            console.log('微信分享取消')
          }
        },
        instructions: '请使用微信JS-SDK进行分享'
      }

    } catch (error) {
      console.error('微信分享失败:', error)
      return {
        success: false,
        platform: 'wechat',
        error: error.message
      }
    }
  }

  // 豆瓣分享
  async shareToDouban(content) {
    try {
      const shareUrl = this.generateShareUrl(content.type, content)
      
      // 生成豆瓣分享链接
      const shareLink = `https://www.douban.com/share/service?href=${encodeURIComponent(shareUrl)}&name=${encodeURIComponent(content.title || '')}&text=${encodeURIComponent(content.description || '')}&image=${encodeURIComponent(content.image || '')}`
      
      return {
        success: true,
        platform: 'douban',
        type: 'link',
        url: shareLink,
        instructions: '请在新窗口打开链接完成分享'
      }

    } catch (error) {
      console.error('豆瓣分享失败:', error)
      return {
        success: false,
        platform: 'douban',
        error: error.message
      }
    }
  }

  // 复制链接
  async copyLink(content) {
    try {
      const shareUrl = this.generateShareUrl(content.type, content)
      
      return {
        success: true,
        platform: 'clipboard',
        type: 'copy',
        url: shareUrl,
        instructions: '链接已复制到剪贴板'
      }

    } catch (error) {
      console.error('复制链接失败:', error)
      return {
        success: false,
        platform: 'clipboard',
        error: error.message
      }
    }
  }

  // 生成二维码
  async generateQRCode(content, options = {}) {
    try {
      const shareUrl = this.generateShareUrl(content.type, content)
      const size = options.size || 200
      
      // 使用第三方服务生成二维码
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(shareUrl)}`
      
      return {
        success: true,
        type: 'qrcode',
        url: qrCodeUrl,
        dataUrl: shareUrl,
        size: size
      }

    } catch (error) {
      console.error('生成二维码失败:', error)
      return {
        success: false,
        type: 'qrcode',
        error: error.message
      }
    }
  }

  // 批量分享
  async shareToMultiplePlatforms(content, platforms) {
    try {
      const results = []
      
      for (const platform of platforms) {
        let result
        
        switch (platform) {
          case 'weibo':
            result = await this.shareToWeibo(content)
            break
          case 'qzone':
            result = await this.shareToQZone(content)
            break
          case 'wechat':
            result = await this.shareToWechat(content)
            break
          case 'douban':
            result = await this.shareToDouban(content)
            break
          case 'copy':
            result = await this.copyLink(content)
            break
          default:
            result = {
              success: false,
              platform: platform,
              error: '不支持的分享平台'
            }
        }
        
        results.push(result)
      }
      
      return {
        success: true,
        results: results,
        total: platforms.length,
        successful: results.filter(r => r.success).length
      }

    } catch (error) {
      console.error('批量分享失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 获取分享统计
  async getShareStats(contentId, platform = 'all') {
    try {
      // 这里可以从数据库获取分享统计数据
      // 暂时返回模拟数据
      const stats = {
        total: 156,
        weibo: 45,
        qzone: 67,
        wechat: 32,
        douban: 12,
        other: 0,
        lastUpdated: new Date().toISOString()
      }
      
      if (platform === 'all') {
        return stats
      } else {
        return {
          [platform]: stats[platform] || 0,
          lastUpdated: stats.lastUpdated
        }
      }

    } catch (error) {
      console.error('获取分享统计失败:', error)
      return null
    }
  }

  // 记录分享行为
  async recordShare(userId, contentId, platform, shareData = {}) {
    try {
      console.log(`📤 记录分享 - 用户: ${userId}, 内容: ${contentId}, 平台: ${platform}`)
      
      // 这里可以将分享记录保存到数据库
      return {
        success: true,
        message: '分享记录保存成功',
        recordId: `share_${Date.now()}`,
        timestamp: new Date().toISOString()
      }

    } catch (error) {
      console.error('记录分享失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // 获取热门分享内容
  async getTrendingShares(limit = 10) {
    try {
      // 这里可以从数据库获取热门分享内容
      // 暂时返回模拟数据
      const trending = [
        {
          id: '1',
          title: '热门游戏讨论',
          type: 'post',
          shareCount: 245,
          tiebaName: '游戏贴吧'
        },
        {
          id: '2',
          title: '技术交流分享',
          type: 'post',
          shareCount: 189,
          tiebaName: '技术贴吧'
        },
        {
          id: '3',
          title: '生活经验分享',
          type: 'post',
          shareCount: 156,
          tiebaName: '生活贴吧'
        }
      ]
      
      return trending.slice(0, limit)

    } catch (error) {
      console.error('获取热门分享失败:', error)
      return []
    }
  }

  // 服务状态检查
  getServiceStatus() {
    return {
      weibo: this.isWeiboEnabled,
      qzone: this.isQQEnabled,
      wechat: this.isWechatEnabled,
      timestamp: new Date().toISOString()
    }
  }

  // 验证分享内容
  validateShareContent(content) {
    const errors = []
    
    if (!content.type) {
      errors.push('分享类型不能为空')
    }
    
    if (!content.id) {
      errors.push('内容ID不能为空')
    }
    
    if (content.title && content.title.length > 200) {
      errors.push('标题长度不能超过200字符')
    }
    
    if (content.description && content.description.length > 500) {
      errors.push('描述长度不能超过500字符')
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    }
  }
}

// 创建单例实例
const socialShareService = new SocialShareService()

export default socialShareService