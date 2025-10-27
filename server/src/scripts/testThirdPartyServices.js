import notificationService from '../services/notificationService.js'
import mapService from '../services/mapService.js'
import socialShareService from '../services/socialShareService.js'

async function testThirdPartyServices() {
  console.log('=== 第三方服务集成测试 ===\n')
  
  try {
    // 测试通知服务
    console.log('1. 测试通知服务...')
    const notificationStatus = notificationService.getServiceStatus()
    console.log('   通知服务状态:', notificationStatus)
    
    // 测试地图服务
    console.log('\n2. 测试地图服务...')
    const mapStatus = mapService.getServiceStatus()
    console.log('   地图服务状态:', mapStatus)
    
    // 测试地理编码功能
    if (mapStatus.baidu.available || mapStatus.google.available) {
      console.log('   测试地理编码...')
      const geocodeResult = await mapService.geocode('北京市朝阳区', 'baidu')
      console.log('   地理编码结果:', geocodeResult ? '成功' : '失败')
    }
    
    // 测试社交分享服务
    console.log('\n3. 测试社交分享服务...')
    const socialStatus = socialShareService.getServiceStatus()
    console.log('   社交分享服务状态:', socialStatus)
    
    // 测试分享链接生成
    if (socialStatus.available) {
      console.log('   测试分享链接生成...')
      const shareLink = await socialShareService.generateShareLink({
        platform: 'weibo',
        title: '测试分享',
        url: 'https://example.com',
        description: '这是一个测试分享'
      })
      console.log('   分享链接生成:', shareLink ? '成功' : '失败')
    }
    
    // 测试二维码生成
    console.log('\n4. 测试二维码生成...')
    const qrCode = await socialShareService.generateQRCode('https://example.com', 200, 1)
    console.log('   二维码生成:', qrCode ? '成功' : '失败')
    
    // 测试批量功能
    console.log('\n5. 测试批量功能...')
    
    // 批量地理编码测试
    if (mapStatus.baidu.available || mapStatus.google.available) {
      console.log('   批量地理编码测试...')
      const addresses = ['北京市', '上海市', '广州市']
      const batchResults = []
      
      for (const address of addresses) {
        try {
          const result = await mapService.geocode(address, 'baidu')
          batchResults.push({ address, success: !!result })
        } catch (error) {
          batchResults.push({ address, success: false, error: error.message })
        }
      }
      
      console.log('   批量地理编码结果:')
      batchResults.forEach(result => {
        console.log(`     ${result.address}: ${result.success ? '成功' : '失败'}`)
      })
    }
    
    // 测试距离计算
    console.log('\n6. 测试距离计算...')
    const distance = mapService.calculateDistance(39.9042, 116.4074, 31.2304, 121.4737, 'km')
    console.log('   北京到上海距离:', distance.toFixed(2), '公里')
    
    // 测试通知发送
    console.log('\n7. 测试通知发送...')
    try {
      await notificationService.sendSystemNotification({
        title: '系统测试通知',
        content: '这是一个系统测试通知',
        type: 'info',
        targetUsers: []
      })
      console.log('   系统通知发送: 成功')
    } catch (error) {
      console.log('   系统通知发送: 失败 -', error.message)
    }
    
    // 测试分享统计
    console.log('\n8. 测试分享统计...')
    const stats = await socialShareService.getShareStats({
      limit: 10
    })
    console.log('   分享统计获取:', stats ? '成功' : '失败')
    
    // 测试服务健康检查
    console.log('\n9. 服务健康检查...')
    
    const services = [
      { name: '通知服务', status: notificationStatus },
      { name: '地图服务', status: mapStatus },
      { name: '社交分享服务', status: socialStatus }
    ]
    
    services.forEach(service => {
      const available = service.status.available || 
                       (service.status.baidu && service.status.baidu.available) ||
                       (service.status.google && service.status.google.available)
      console.log(`   ${service.name}: ${available ? '✅ 正常' : '❌ 异常'}`)
    })
    
    // 生成测试报告
    console.log('\n=== 测试报告 ===')
    console.log('第三方服务集成测试完成!')
    console.log('建议配置:')
    console.log('1. 在.env文件中配置第三方API密钥')
    console.log('2. 确保网络连接正常')
    console.log('3. 检查服务配额和限制')
    
  } catch (error) {
    console.error('测试过程中出现错误:', error)
    console.log('\n=== 错误报告 ===')
    console.log('错误类型:', error.name)
    console.log('错误信息:', error.message)
    console.log('\n建议检查:')
    console.log('1. 第三方服务配置是否正确')
    console.log('2. API密钥是否有效')
    console.log('3. 网络连接是否正常')
  }
}

// 命令行执行
if (import.meta.url === `file://${process.argv[1]}`) {
  testThirdPartyServices()
    .then(() => {
      console.log('\n测试完成!')
      process.exit(0)
    })
    .catch(error => {
      console.error('测试失败:', error)
      process.exit(1)
    })
}

export default testThirdPartyServices