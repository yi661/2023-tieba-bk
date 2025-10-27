# 第三方服务集成文档

## 概述

本文档详细介绍了百度贴吧项目中集成的第三方服务，包括推送通知、地图服务和社交分享功能。

## 推送通知服务

### 功能特性

- **系统通知**: 向所有用户或特定用户组发送系统通知
- **贴吧通知**: 贴吧相关事件通知（新帖子、置顶、精华等）
- **私信通知**: 用户间私信通知
- **互动通知**: 点赞、评论、关注等互动通知
- **批量发送**: 支持批量发送通知
- **用户设置**: 用户可自定义通知偏好

### 配置说明

在 `.env` 文件中配置以下参数：

```env
# 推送服务配置
PUSH_SERVICE_ENABLED=true
PUSH_SERVICE_PROVIDER=onesignal  # onesignal, fcm, apns
ONESIGNAL_APP_ID=your_onesignal_app_id
ONESIGNAL_API_KEY=your_onesignal_api_key
FCM_SERVER_KEY=your_fcm_server_key
APNS_CERTIFICATE_PATH=path/to/certificate.pem
```

### API 端点

- `GET /api/notifications/settings` - 获取用户通知设置
- `PUT /api/notifications/settings` - 更新用户通知设置
- `GET /api/notifications/unread-count` - 获取未读通知数量
- `POST /api/notifications/mark-read` - 标记通知为已读
- `DELETE /api/notifications/clear` - 清除所有通知
- `POST /api/notifications/test` - 发送测试通知
- `GET /api/notifications/status` - 获取通知服务状态

## 地图服务

### 功能特性

- **地理编码**: 地址转坐标
- **逆地理编码**: 坐标转地址
- **距离计算**: 计算两点间距离
- **附近搜索**: 搜索附近地点
- **路线规划**: 多种出行方式路线规划
- **IP定位**: 根据IP地址获取地理位置
- **批量处理**: 支持批量地理编码

### 配置说明

在 `.env` 文件中配置以下参数：

```env
# 地图服务配置
MAP_SERVICE_ENABLED=true
MAP_SERVICE_PROVIDER=baidu  # baidu, google
BAIDU_MAP_AK=your_baidu_map_ak
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
IP_GEOLOCATION_API_KEY=your_ip_geolocation_api_key
```

### API 端点

- `GET /api/maps/geocode` - 地理编码（地址转坐标）
- `GET /api/maps/reverse-geocode` - 逆地理编码（坐标转地址）
- `GET /api/maps/distance` - 计算两点间距离
- `GET /api/maps/nearby` - 搜索附近地点
- `GET /api/maps/route` - 路线规划
- `GET /api/maps/ip-location` - IP地址定位
- `POST /api/maps/batch-geocode` - 批量地理编码
- `GET /api/maps/status` - 获取地图服务状态

## 社交分享服务

### 功能特性

- **多平台支持**: 微博、QQ空间、微信、豆瓣等
- **分享链接生成**: 自动生成各平台分享链接
- **二维码生成**: 为分享链接生成二维码
- **分享统计**: 统计分享次数和效果
- **分享记录**: 记录用户分享行为
- **热门内容**: 获取热门分享内容
- **批量生成**: 支持批量生成分享链接

### 配置说明

在 `.env` 文件中配置以下参数：

```env
# 社交分享服务配置
SOCIAL_SHARE_ENABLED=true
WEIBO_APP_KEY=your_weibo_app_key
WEIBO_APP_SECRET=your_weibo_app_secret
QQ_APP_ID=your_qq_app_id
QQ_APP_KEY=your_qq_app_key
WECHAT_APP_ID=your_wechat_app_id
WECHAT_APP_SECRET=your_wechat_app_secret
DOUBAN_API_KEY=your_douban_api_key
```

### API 端点

- `POST /api/social/generate-link` - 生成分享链接
- `POST /api/social/batch-generate-links` - 批量生成分享链接
- `GET /api/social/stats` - 获取分享统计
- `POST /api/social/record` - 记录分享行为
- `GET /api/social/popular` - 获取热门分享内容
- `GET /api/social/qrcode` - 生成二维码
- `GET /api/social/platforms` - 获取支持的分享平台
- `GET /api/social/test` - 测试分享服务
- `GET /api/social/history` - 获取用户分享历史

## 服务集成示例

### 推送通知集成

```javascript
import notificationService from '../services/notificationService.js'

// 发送系统通知
await notificationService.sendSystemNotification({
  title: '系统公告',
  content: '新版本已发布，请及时更新',
  type: 'info',
  targetUsers: ['all'] // 发送给所有用户
})

// 发送贴吧通知
await notificationService.sendTiebaNotification({
  tiebaId: '123',
  title: '新帖子',
  content: '有人在你的贴吧发布了新帖子',
  type: 'new_post',
  targetUsers: ['456', '789'] // 发送给特定用户
})
```

### 地图服务集成

```javascript
import mapService from '../services/mapService.js'

// 地理编码
const location = await mapService.geocode('北京市朝阳区', 'baidu')
console.log('坐标:', location.lat, location.lng)

// 附近搜索
const nearbyPlaces = await mapService.searchNearby(
  39.9042, 116.4074, // 北京坐标
  1000, // 1公里范围内
  '餐厅', // 搜索关键词
  'baidu'
)

// 路线规划
const route = await mapService.getRoute(
  39.9042, 116.4074, // 起点：北京
  31.2304, 121.4737, // 终点：上海
  'driving', // 驾车方式
  'baidu'
)
```

### 社交分享集成

```javascript
import socialShareService from '../services/socialShareService.js'

// 生成分享链接
const shareLink = await socialShareService.generateShareLink({
  platform: 'weibo',
  title: '有趣的帖子',
  url: 'https://tieba.com/posts/123',
  description: '分享一个有趣的帖子',
  image: 'https://tieba.com/images/123.jpg',
  tags: ['贴吧', '分享']
})

// 记录分享行为
await socialShareService.recordShare({
  platform: 'weibo',
  url: 'https://tieba.com/posts/123',
  title: '有趣的帖子',
  type: 'post',
  userId: '456'
})
```

## 错误处理

所有第三方服务都实现了统一的错误处理机制：

```javascript
try {
  const result = await service.someMethod(params)
  // 处理成功结果
} catch (error) {
  console.error('服务调用失败:', error)
  
  // 根据错误类型处理
  if (error.code === 'RATE_LIMIT') {
    // 处理频率限制
  } else if (error.code === 'AUTH_ERROR') {
    // 处理认证错误
  } else {
    // 处理其他错误
  }
}
```

## 性能优化建议

1. **缓存策略**: 对频繁请求的数据实施缓存
2. **批量操作**: 尽量使用批量接口减少API调用次数
3. **异步处理**: 非关键操作使用异步处理
4. **错误重试**: 实现指数退避重试机制
5. **监控告警**: 设置服务监控和告警机制

## 安全考虑

1. **API密钥保护**: 不要将API密钥提交到版本控制系统
2. **请求限制**: 实施合理的API调用频率限制
3. **数据验证**: 对所有输入数据进行严格验证
4. **错误信息**: 避免在错误响应中泄露敏感信息
5. **HTTPS**: 确保所有API调用使用HTTPS

## 测试指南

运行第三方服务测试：

```bash
cd server
node src/scripts/testThirdPartyServices.js
```

## 故障排除

### 常见问题

1. **API密钥无效**: 检查.env文件中的API密钥配置
2. **网络连接问题**: 检查网络连接和防火墙设置
3. **服务配额超限**: 检查API调用配额和使用情况
4. **证书问题**: 检查SSL证书配置

### 日志查看

服务日志位于 `logs/` 目录：

- `notification-service.log` - 通知服务日志
- `map-service.log` - 地图服务日志
- `social-service.log` - 社交分享服务日志

## 版本历史

- v1.0.0 (2024-01-01): 初始版本，集成基础第三方服务
- v1.1.0 (2024-01-15): 增加批量操作和错误重试机制
- v1.2.0 (2024-02-01): 优化性能和安全配置

## 支持与反馈

如有问题或建议，请联系开发团队或提交Issue。