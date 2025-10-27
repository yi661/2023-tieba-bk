// 用户相关类型
export interface UserInfo {
  id: string
  username: string
  nickname: string
  avatar: string
  email: string
  phone?: string
  level: number
  experience: number
  joinTime: string
  lastLogin: string
  signature?: string
  gender: 'male' | 'female' | 'unknown'
  birthday?: string
  location?: string
}

// 贴吧相关类型
export interface TiebaInfo {
  id: string
  name: string
  description: string
  avatar: string
  banner: string
  memberCount: number
  postCount: number
  todayPostCount: number
  createTime: string
  adminId: string
  category: string
  tags: string[]
  isOfficial: boolean
  isJoined: boolean
  rules?: string
}

// 帖子相关类型
export interface PostInfo {
  id: string
  title: string
  content: string
  author: UserInfo
  tieba: TiebaInfo
  createTime: string
  updateTime: string
  viewCount: number
  replyCount: number
  likeCount: number
  isLiked: boolean
  isSticky: boolean
  isEssence: boolean
  images?: string[]
  tags?: string[]
  lastReply?: {
    user: UserInfo
    time: string
  }
}

// 评论相关类型
export interface CommentInfo {
  id: string
  content: string
  author: UserInfo
  postId: string
  parentId?: string
  createTime: string
  likeCount: number
  isLiked: boolean
  replies?: CommentInfo[]
}

// 消息相关类型
export interface MessageInfo {
  id: string
  type: 'system' | 'reply' | 'like' | 'follow' | 'mention'
  title: string
  content: string
  sender?: UserInfo
  relatedPost?: PostInfo
  createTime: string
  read: boolean
}

// 搜索相关类型
export interface SearchResult {
  type: 'tieba' | 'post' | 'user'
  data: TiebaInfo | PostInfo | UserInfo
  relevance: number
}

// 状态管理类型

// UI状态
export interface UIState {
  theme: 'light' | 'dark'
  sidebarCollapsed: boolean
  loading: boolean
  modalOpen: boolean
  currentModal: string
}

// 搜索状态
export interface SearchState {
  keyword: string
  results: SearchResult[]
  history: string[]
  searching: boolean
}

// 消息状态
export interface MessageState {
  unreadCount: number
  messages: MessageInfo[]
  notifications: any[]
}

// 应用状态
export interface AppState {
  ui: UIState
  search: SearchState
  message: MessageState
}

// API响应类型
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
  success: boolean
}

// 分页类型
export interface PaginationParams {
  page: number
  pageSize: number
  total: number
}

// 文件上传类型
export interface UploadFile {
  id: string
  name: string
  url: string
  size: number
  type: string
  uploadTime: string
}

// 表单验证类型
export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  validator?: (value: any) => boolean | string
}

// 路由元信息类型
export interface RouteMeta {
  title: string
  requiresAuth?: boolean
  keepAlive?: boolean
  roles?: string[]
}

// 第三方登录配置
export interface OAuthConfig {
  wechat?: {
    appId: string
    redirectUri: string
  }
  qq?: {
    appId: string
    redirectUri: string
  }
  weibo?: {
    appId: string
    redirectUri: string
  }
}

// 地图配置
export interface MapConfig {
  provider: 'baidu' | 'gaode' | 'tencent'
  apiKey: string
  center: [number, number]
  zoom: number
}

// 推送配置
export interface PushConfig {
  enabled: boolean
  provider: 'websocket' | 'sse' | 'firebase'
  endpoint?: string
}

// 项目配置
export interface AppConfig {
  name: string
  version: string
  apiBaseUrl: string
  uploadUrl: string
  oauth: OAuthConfig
  map: MapConfig
  push: PushConfig
  features: {
    darkMode: boolean
    pwa: boolean
    offline: boolean
    notification: boolean
  }
}

// 组件Props类型
export interface BaseProps {
  className?: string
  style?: Record<string, any>
  children?: any
}

// 通用列表类型
export interface ListResponse<T> {
  items: T[]
  pagination: PaginationParams
}

// 错误类型
export interface AppError {
  code: string
  message: string
  details?: any
}

// 事件类型
export interface CustomEventMap {
  'theme-change': { theme: 'light' | 'dark' }
  'user-login': { user: UserInfo }
  'user-logout': {}
  'post-created': { post: PostInfo }
  'tieba-joined': { tieba: TiebaInfo }
}

export type CustomEventType = keyof CustomEventMap