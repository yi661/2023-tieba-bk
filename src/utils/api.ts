import axios from 'axios'
import type { ApiResponse, UserInfo, TiebaInfo, PostInfo, CommentInfo } from '@types/index'

// 创建axios实例
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// API接口定义
export const apiService = {
  // 用户相关API
  user: {
    login: (data: { username: string; password: string }) =>
      api.post<ApiResponse<{ token: string; user: UserInfo }>>('/auth/login', data),
    
    register: (data: { username: string; password: string; email: string }) =>
      api.post<ApiResponse<UserInfo>>('/auth/register', data),
    
    getProfile: () =>
      api.get<ApiResponse<UserInfo>>('/user/profile'),
    
    updateProfile: (data: Partial<UserInfo>) =>
      api.put<ApiResponse<UserInfo>>('/user/profile', data),
    
    changePassword: (data: { oldPassword: string; newPassword: string }) =>
      api.put<ApiResponse>('/user/password', data)
  },

  // 贴吧相关API
  tieba: {
    getList: (params?: { page?: number; pageSize?: number; category?: string }) =>
      api.get<ApiResponse<{ items: TiebaInfo[]; total: number }>>('/tiebas', { params }),
    
    getDetail: (id: string) =>
      api.get<ApiResponse<TiebaInfo>>(`/tiebas/${id}`),
    
    create: (data: { name: string; description: string; category: string }) =>
      api.post<ApiResponse<TiebaInfo>>('/tiebas', data),
    
    join: (id: string) =>
      api.post<ApiResponse>(`/tiebas/${id}/join`),
    
    leave: (id: string) =>
      api.post<ApiResponse>(`/tiebas/${id}/leave`),
    
    search: (keyword: string) =>
      api.get<ApiResponse<TiebaInfo[]>>('/tiebas/search', { params: { keyword } })
  },

  // 帖子相关API
  post: {
    getList: (tiebaId?: string, params?: { page?: number; pageSize?: number }) =>
      api.get<ApiResponse<{ items: PostInfo[]; total: number }>>(
        tiebaId ? `/tiebas/${tiebaId}/posts` : '/posts',
        { params }
      ),
    
    getDetail: (id: string) =>
      api.get<ApiResponse<PostInfo>>(`/posts/${id}`),
    
    create: (data: { tiebaId: string; title: string; content: string; images?: string[] }) =>
      api.post<ApiResponse<PostInfo>>('/posts', data),
    
    update: (id: string, data: Partial<PostInfo>) =>
      api.put<ApiResponse<PostInfo>>(`/posts/${id}`, data),
    
    delete: (id: string) =>
      api.delete<ApiResponse>(`/posts/${id}`),
    
    like: (id: string) =>
      api.post<ApiResponse>(`/posts/${id}/like`),
    
    unlike: (id: string) =>
      api.post<ApiResponse>(`/posts/${id}/unlike`)
  },

  // 评论相关API
  comment: {
    getList: (postId: string, params?: { page?: number; pageSize?: number }) =>
      api.get<ApiResponse<{ items: CommentInfo[]; total: number }>>(
        `/posts/${postId}/comments`,
        { params }
      ),
    
    create: (postId: string, data: { content: string; parentId?: string }) =>
      api.post<ApiResponse<CommentInfo>>(`/posts/${postId}/comments`, data),
    
    delete: (id: string) =>
      api.delete<ApiResponse>(`/comments/${id}`),
    
    like: (id: string) =>
      api.post<ApiResponse>(`/comments/${id}/like`),
    
    unlike: (id: string) =>
      api.post<ApiResponse>(`/comments/${id}/unlike`)
  },

  // 搜索相关API
  search: {
    global: (keyword: string, params?: { type?: 'tieba' | 'post' | 'user' }) =>
      api.get<ApiResponse<any[]>>('/search', { params: { keyword, ...params } })
  },

  // 文件上传API
  upload: {
    image: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return api.post<ApiResponse<{ url: string }>>('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
    },
    
    avatar: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return api.post<ApiResponse<{ url: string }>>('/upload/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
    }
  }
}

// 导出axios实例
export default api