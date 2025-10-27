import axios from 'axios'

class MapService {
  constructor() {
    this.baiduApiKey = process.env.BAIDU_MAP_API_KEY || ''
    this.googleApiKey = process.env.GOOGLE_MAPS_API_KEY || ''
    this.isBaiduEnabled = !!this.baiduApiKey
    this.isGoogleEnabled = !!this.googleApiKey
  }

  // 地址转坐标（地理编码）
  async geocode(address, provider = 'baidu') {
    try {
      if (provider === 'baidu' && this.isBaiduEnabled) {
        return await this.baiduGeocode(address)
      } else if (provider === 'google' && this.isGoogleEnabled) {
        return await this.googleGeocode(address)
      } else {
        throw new Error('没有可用的地图服务提供商')
      }
    } catch (error) {
      console.error('地理编码失败:', error)
      return null
    }
  }

  // 百度地图地理编码
  async baiduGeocode(address) {
    try {
      const response = await axios.get('http://api.map.baidu.com/geocoding/v3/', {
        params: {
          address: address,
          output: 'json',
          ak: this.baiduApiKey
        }
      })

      if (response.data.status === 0) {
        const result = response.data.result
        return {
          latitude: result.location.lat,
          longitude: result.location.lng,
          formattedAddress: result.formatted_address,
          confidence: result.confidence,
          level: result.level,
          provider: 'baidu'
        }
      } else {
        throw new Error(`百度地图API错误: ${response.data.message}`)
      }
    } catch (error) {
      console.error('百度地图地理编码失败:', error)
      throw error
    }
  }

  // 谷歌地图地理编码
  async googleGeocode(address) {
    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          address: address,
          key: this.googleApiKey
        }
      })

      if (response.data.status === 'OK') {
        const result = response.data.results[0]
        return {
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng,
          formattedAddress: result.formatted_address,
          placeId: result.place_id,
          types: result.types,
          provider: 'google'
        }
      } else {
        throw new Error(`谷歌地图API错误: ${response.data.status}`)
      }
    } catch (error) {
      console.error('谷歌地图地理编码失败:', error)
      throw error
    }
  }

  // 坐标转地址（逆地理编码）
  async reverseGeocode(latitude, longitude, provider = 'baidu') {
    try {
      if (provider === 'baidu' && this.isBaiduEnabled) {
        return await this.baiduReverseGeocode(latitude, longitude)
      } else if (provider === 'google' && this.isGoogleEnabled) {
        return await this.googleReverseGeocode(latitude, longitude)
      } else {
        throw new Error('没有可用的地图服务提供商')
      }
    } catch (error) {
      console.error('逆地理编码失败:', error)
      return null
    }
  }

  // 百度地图逆地理编码
  async baiduReverseGeocode(latitude, longitude) {
    try {
      const response = await axios.get('http://api.map.baidu.com/reverse_geocoding/v3/', {
        params: {
          location: `${latitude},${longitude}`,
          output: 'json',
          ak: this.baiduApiKey,
          coordtype: 'wgs84ll'
        }
      })

      if (response.data.status === 0) {
        const result = response.data.result
        return {
          address: result.formatted_address,
          country: result.addressComponent.country,
          province: result.addressComponent.province,
          city: result.addressComponent.city,
          district: result.addressComponent.district,
          street: result.addressComponent.street,
          streetNumber: result.addressComponent.street_number,
          provider: 'baidu'
        }
      } else {
        throw new Error(`百度地图API错误: ${response.data.message}`)
      }
    } catch (error) {
      console.error('百度地图逆地理编码失败:', error)
      throw error
    }
  }

  // 谷歌地图逆地理编码
  async googleReverseGeocode(latitude, longitude) {
    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          latlng: `${latitude},${longitude}`,
          key: this.googleApiKey
        }
      })

      if (response.data.status === 'OK') {
        const result = response.data.results[0]
        return {
          address: result.formatted_address,
          placeId: result.place_id,
          types: result.types,
          addressComponents: result.address_components,
          provider: 'google'
        }
      } else {
        throw new Error(`谷歌地图API错误: ${response.data.status}`)
      }
    } catch (error) {
      console.error('谷歌地图逆地理编码失败:', error)
      throw error
    }
  }

  // 计算两点间距离
  calculateDistance(lat1, lon1, lat2, lon2, unit = 'km') {
    const R = unit === 'km' ? 6371 : 3959 // 地球半径（公里或英里）
    const dLat = this.deg2rad(lat2 - lat1)
    const dLon = this.deg2rad(lon2 - lon1)
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c
    
    return distance
  }

  // 角度转弧度
  deg2rad(deg) {
    return deg * (Math.PI / 180)
  }

  // 搜索附近地点
  async searchNearby(latitude, longitude, radius = 1000, keyword = '', provider = 'baidu') {
    try {
      if (provider === 'baidu' && this.isBaiduEnabled) {
        return await this.baiduSearchNearby(latitude, longitude, radius, keyword)
      } else if (provider === 'google' && this.isGoogleEnabled) {
        return await this.googleSearchNearby(latitude, longitude, radius, keyword)
      } else {
        throw new Error('没有可用的地图服务提供商')
      }
    } catch (error) {
      console.error('附近搜索失败:', error)
      return []
    }
  }

  // 百度地图附近搜索
  async baiduSearchNearby(latitude, longitude, radius, keyword) {
    try {
      const response = await axios.get('http://api.map.baidu.com/place/v2/search', {
        params: {
          query: keyword,
          location: `${latitude},${longitude}`,
          radius: radius,
          output: 'json',
          ak: this.baiduApiKey
        }
      })

      if (response.data.status === 0) {
        return response.data.results.map(place => ({
          name: place.name,
          address: place.address,
          latitude: place.location.lat,
          longitude: place.location.lng,
          distance: place.detail_info?.distance,
          type: place.detail_info?.type,
          provider: 'baidu'
        }))
      } else {
        throw new Error(`百度地图API错误: ${response.data.message}`)
      }
    } catch (error) {
      console.error('百度地图附近搜索失败:', error)
      throw error
    }
  }

  // 谷歌地图附近搜索
  async googleSearchNearby(latitude, longitude, radius, keyword) {
    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
        params: {
          location: `${latitude},${longitude}`,
          radius: radius,
          keyword: keyword,
          key: this.googleApiKey
        }
      })

      if (response.data.status === 'OK') {
        return response.data.results.map(place => ({
          name: place.name,
          address: place.vicinity,
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
          rating: place.rating,
          types: place.types,
          provider: 'google'
        }))
      } else {
        throw new Error(`谷歌地图API错误: ${response.data.status}`)
      }
    } catch (error) {
      console.error('谷歌地图附近搜索失败:', error)
      throw error
    }
  }

  // 获取路线规划
  async getRoute(originLat, originLng, destLat, destLng, mode = 'driving', provider = 'baidu') {
    try {
      if (provider === 'baidu' && this.isBaiduEnabled) {
        return await this.baiduGetRoute(originLat, originLng, destLat, destLng, mode)
      } else if (provider === 'google' && this.isGoogleEnabled) {
        return await this.googleGetRoute(originLat, originLng, destLat, destLng, mode)
      } else {
        throw new Error('没有可用的地图服务提供商')
      }
    } catch (error) {
      console.error('路线规划失败:', error)
      return null
    }
  }

  // 百度地图路线规划
  async baiduGetRoute(originLat, originLng, destLat, destLng, mode) {
    try {
      const modeMap = {
        driving: 'driving',
        walking: 'walking',
        transit: 'transit',
        riding: 'riding'
      }

      const response = await axios.get('http://api.map.baidu.com/direction/v2/' + modeMap[mode], {
        params: {
          origin: `${originLat},${originLng}`,
          destination: `${destLat},${destLng}`,
          ak: this.baiduApiKey
        }
      })

      if (response.data.status === 0) {
        const result = response.data.result
        return {
          distance: result.routes[0]?.distance,
          duration: result.routes[0]?.duration,
          steps: result.routes[0]?.steps,
          provider: 'baidu',
          mode: mode
        }
      } else {
        throw new Error(`百度地图API错误: ${response.data.message}`)
      }
    } catch (error) {
      console.error('百度地图路线规划失败:', error)
      throw error
    }
  }

  // 获取IP地址地理位置
  async getLocationByIP(ip = '') {
    try {
      // 使用免费IP地理位置服务
      const response = await axios.get(`http://ip-api.com/json/${ip}`)
      
      if (response.data.status === 'success') {
        return {
          country: response.data.country,
          region: response.data.regionName,
          city: response.data.city,
          latitude: response.data.lat,
          longitude: response.data.lon,
          isp: response.data.isp,
          ip: response.data.query
        }
      } else {
        throw new Error('IP地理位置查询失败')
      }
    } catch (error) {
      console.error('IP地理位置查询失败:', error)
      return null
    }
  }

  // 服务状态检查
  getServiceStatus() {
    return {
      baidu: this.isBaiduEnabled,
      google: this.isGoogleEnabled,
      timestamp: new Date().toISOString()
    }
  }
}

// 创建单例实例
const mapService = new MapService()

export default mapService