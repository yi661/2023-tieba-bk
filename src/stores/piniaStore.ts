import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserInfo, TiebaInfo, PostInfo } from '@types/index'

// Pinia状态管理 - 用户相关
export const useUserStore = defineStore('user', () => {
  // 状态
  const userInfo = ref<UserInfo | null>(null)
  const token = ref<string>('')
  const isLoggedIn = computed(() => !!token.value)
  
  // 操作
  const setUserInfo = (info: UserInfo) => {
    userInfo.value = info
  }
  
  const setToken = (newToken: string) => {
    token.value = newToken
    localStorage.setItem('token', newToken)
  }
  
  const clearUserInfo = () => {
    userInfo.value = null
    token.value = ''
    localStorage.removeItem('token')
  }
  
  const login = async (username: string, password: string) => {
    // 模拟登录API调用
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    
    if (response.ok) {
      const data = await response.json()
      setToken(data.token)
      setUserInfo(data.userInfo)
      return true
    }
    return false
  }
  
  const logout = () => {
    clearUserInfo()
  }
  
  return {
    userInfo,
    token,
    isLoggedIn,
    setUserInfo,
    setToken,
    clearUserInfo,
    login,
    logout
  }
})

// Pinia状态管理 - 贴吧相关
export const useTiebaStore = defineStore('tieba', () => {
  const currentTieba = ref<TiebaInfo | null>(null)
  const tiebaList = ref<TiebaInfo[]>([])
  const joinedTiebas = ref<TiebaInfo[]>([])
  
  const setCurrentTieba = (tieba: TiebaInfo) => {
    currentTieba.value = tieba
  }
  
  const fetchTiebaList = async () => {
    // 模拟获取贴吧列表
    const response = await fetch('/api/tiebas')
    if (response.ok) {
      tiebaList.value = await response.json()
    }
  }
  
  const joinTieba = async (tiebaId: string) => {
    const response = await fetch(`/api/tiebas/${tiebaId}/join`, {
      method: 'POST'
    })
    if (response.ok) {
      const tieba = tiebaList.value.find(t => t.id === tiebaId)
      if (tieba) {
        joinedTiebas.value.push(tieba)
      }
    }
  }
  
  return {
    currentTieba,
    tiebaList,
    joinedTiebas,
    setCurrentTieba,
    fetchTiebaList,
    joinTieba
  }
})

// Pinia状态管理 - 帖子相关
export const usePostStore = defineStore('post', () => {
  const currentPost = ref<PostInfo | null>(null)
  const postList = ref<PostInfo[]>([])
  const myPosts = ref<PostInfo[]>([])
  
  const setCurrentPost = (post: PostInfo) => {
    currentPost.value = post
  }
  
  const fetchPosts = async (tiebaId?: string) => {
    const url = tiebaId ? `/api/tiebas/${tiebaId}/posts` : '/api/posts'
    const response = await fetch(url)
    if (response.ok) {
      postList.value = await response.json()
    }
  }
  
  const createPost = async (postData: Partial<PostInfo>) => {
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData)
    })
    
    if (response.ok) {
      const newPost = await response.json()
      postList.value.unshift(newPost)
      myPosts.value.unshift(newPost)
      return newPost
    }
    return null
  }
  
  return {
    currentPost,
    postList,
    myPosts,
    setCurrentPost,
    fetchPosts,
    createPost
  }
})