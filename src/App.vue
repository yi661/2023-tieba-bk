<template>
  <div id="app">
    <!-- 路由视图 -->
    <router-view />
    
    <!-- 全局加载状态 -->
    <div v-if="loading" class="global-loading">
      <div class="loading-spinner"></div>
    </div>
    
    <!-- 全局消息提示 -->
    <div class="global-messages">
      <transition-group name="message">
        <div 
          v-for="message in messages" 
          :key="message.id"
          :class="['message-item', message.type]"
        >
          {{ message.content }}
        </div>
      </transition-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

// 响应式数据
const loading = ref(false)
const messages = ref([])
const router = useRouter()

// 全局错误处理
const handleGlobalError = (error: Error) => {
  console.error('Global error:', error)
  addMessage('系统错误，请稍后重试', 'error')
}

// 添加全局消息
const addMessage = (content: string, type: 'success' | 'error' | 'warning' = 'success') => {
  const id = Date.now()
  messages.value.push({ id, content, type })
  setTimeout(() => {
    const index = messages.value.findIndex(msg => msg.id === id)
    if (index > -1) {
      messages.value.splice(index, 1)
    }
  }, 3000)
}

// 设置全局加载状态
const setLoading = (isLoading: boolean) => {
  loading.value = isLoading
}

// 暴露全局方法给其他组件使用
defineExpose({
  addMessage,
  setLoading
})

// 生命周期
onMounted(() => {
  // 注册全局错误处理
  window.addEventListener('error', handleGlobalError)
  window.addEventListener('unhandledrejection', (event) => {
    handleGlobalError(event.reason)
  })
})
</script>

<style scoped>
#app {
  min-height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.global-loading {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.global-messages {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
}

.message-item {
  padding: 12px 20px;
  margin-bottom: 10px;
  border-radius: 6px;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.message-item.success {
  background: #52c41a;
}

.message-item.error {
  background: #ff4d4f;
}

.message-item.warning {
  background: #faad14;
}

.message-enter-active,
.message-leave-active {
  transition: all 0.3s ease;
}

.message-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.message-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>