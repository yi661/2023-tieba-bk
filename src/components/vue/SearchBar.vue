<template>
  <div class="search-bar">
    <!-- 搜索输入框 -->
    <div class="search-input-container">
      <input
        v-model="localKeyword"
        type="text"
        :placeholder="placeholder"
        class="search-input"
        @keyup.enter="handleSearch"
        @input="handleInput"
      />
      <button class="search-button" @click="handleSearch">
        <SearchIcon class="search-icon" />
      </button>
    </div>

    <!-- 搜索建议下拉框 -->
    <div v-if="showSuggestions && suggestions.length > 0" class="suggestions-dropdown">
      <div 
        v-for="(suggestion, index) in suggestions" 
        :key="index"
        class="suggestion-item"
        :class="{ active: activeIndex === index }"
        @click="selectSuggestion(suggestion)"
        @mouseenter="activeIndex = index"
      >
        <div class="suggestion-content">
          <span class="suggestion-text">{{ suggestion.text }}</span>
          <span class="suggestion-type">{{ suggestion.type }}</span>
        </div>
      </div>
    </div>

    <!-- 搜索历史 -->
    <div v-if="showHistory && searchHistory.length > 0" class="search-history">
      <div class="history-header">
        <span>搜索历史</span>
        <button @click="clearHistory" class="clear-history">清除</button>
      </div>
      <div class="history-list">
        <div 
          v-for="(item, index) in searchHistory" 
          :key="index"
          class="history-item"
          @click="selectHistory(item)"
        >
          <ClockIcon class="history-icon" />
          <span class="history-text">{{ item }}</span>
          <button @click.stop="removeHistory(index)" class="remove-history">×</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/stores/piniaStore'
import { SearchIcon, ClockIcon } from '@/components/icons'

interface Props {
  placeholder?: string
  size?: 'small' | 'medium' | 'large'
  showSuggestions?: boolean
  showHistory?: boolean
  autoFocus?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '搜索贴吧、帖子、用户...',
  size: 'medium',
  showSuggestions: true,
  showHistory: true,
  autoFocus: false
})

interface Suggestion {
  text: string
  type: 'tieba' | 'post' | 'user'
  id?: string
}

const router = useRouter()
const store = useStore()

const localKeyword = ref('')
const showSuggestions = ref(false)
const showHistoryPanel = ref(false)
const activeIndex = ref(-1)
const searchHistory = ref<string[]>([])
const suggestions = ref<Suggestion[]>([])

// 计算搜索框样式类
const searchClass = computed(() => {
  return [
    'search-bar',
    `size-${props.size}`,
    { 'has-suggestions': showSuggestions.value && suggestions.value.length > 0 }
  ]
})

// 监听关键词变化
watch(localKeyword, (newVal) => {
  if (newVal.trim()) {
    showSuggestions.value = true
    fetchSuggestions(newVal)
  } else {
    showSuggestions.value = false
    suggestions.value = []
  }
})

// 加载搜索历史
onMounted(() => {
  loadSearchHistory()
  
  // 点击外部关闭建议框
  document.addEventListener('click', handleClickOutside)
  
  if (props.autoFocus) {
    const input = document.querySelector('.search-input') as HTMLInputElement
    input?.focus()
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// 加载搜索历史
const loadSearchHistory = () => {
  const history = localStorage.getItem('searchHistory')
  if (history) {
    searchHistory.value = JSON.parse(history).slice(0, 10) // 最多显示10条
  }
}

// 保存搜索历史
const saveSearchHistory = (keyword: string) => {
  if (!keyword.trim()) return
  
  const history = searchHistory.value.filter(item => item !== keyword)
  history.unshift(keyword)
  searchHistory.value = history.slice(0, 20) // 最多保存20条
  
  localStorage.setItem('searchHistory', JSON.stringify(searchHistory.value))
}

// 获取搜索建议
const fetchSuggestions = async (keyword: string) => {
  try {
    // 模拟API调用
    const mockSuggestions: Suggestion[] = [
      { text: `${keyword}吧`, type: 'tieba' },
      { text: `${keyword}相关帖子`, type: 'post' },
      { text: `用户: ${keyword}`, type: 'user' }
    ]
    
    suggestions.value = mockSuggestions
  } catch (error) {
    console.error('获取搜索建议失败:', error)
    suggestions.value = []
  }
}

// 处理搜索
const handleSearch = () => {
  const keyword = localKeyword.value.trim()
  if (!keyword) return
  
  // 保存搜索历史
  saveSearchHistory(keyword)
  
  // 更新store中的搜索关键词
  store.setSearchKeyword(keyword)
  
  // 跳转到搜索页面
  router.push({
    path: '/search',
    query: { keyword }
  })
  
  // 关闭建议框
  showSuggestions.value = false
  showHistoryPanel.value = false
}

// 处理输入
const handleInput = () => {
  showHistoryPanel.value = localKeyword.value === '' && searchHistory.value.length > 0
}

// 选择建议
const selectSuggestion = (suggestion: Suggestion) => {
  localKeyword.value = suggestion.text
  handleSearch()
}

// 选择历史记录
const selectHistory = (keyword: string) => {
  localKeyword.value = keyword
  handleSearch()
}

// 清除历史记录
const clearHistory = () => {
  searchHistory.value = []
  localStorage.removeItem('searchHistory')
}

// 删除单条历史记录
const removeHistory = (index: number) => {
  searchHistory.value.splice(index, 1)
  localStorage.setItem('searchHistory', JSON.stringify(searchHistory.value))
}

// 处理键盘事件
const handleKeyDown = (event: KeyboardEvent) => {
  if (!showSuggestions.value) return
  
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      activeIndex.value = Math.min(activeIndex.value + 1, suggestions.value.length - 1)
      break
    case 'ArrowUp':
      event.preventDefault()
      activeIndex.value = Math.max(activeIndex.value - 1, -1)
      break
    case 'Enter':
      if (activeIndex.value >= 0) {
        event.preventDefault()
        selectSuggestion(suggestions.value[activeIndex.value])
      }
      break
    case 'Escape':
      showSuggestions.value = false
      activeIndex.value = -1
      break
  }
}

// 点击外部关闭建议框
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.search-bar')) {
    showSuggestions.value = false
    showHistoryPanel.value = false
    activeIndex.value = -1
  }
}
</script>

<style scoped lang="scss">
@import '@/styles/variables.scss';

.search-bar {
  position: relative;
  width: 100%;
  
  &.size-small {
    .search-input-container {
      max-width: 200px;
    }
  }
  
  &.size-medium {
    .search-input-container {
      max-width: 300px;
    }
  }
  
  &.size-large {
    .search-input-container {
      max-width: 400px;
    }
  }
}

.search-input-container {
  position: relative;
  display: flex;
  align-items: center;
  background: $color-white;
  border: 1px solid $color-border;
  border-radius: 6px;
  transition: all 0.3s ease;
  overflow: hidden;
  
  &:focus-within {
    border-color: $color-primary;
    box-shadow: 0 0 0 2px rgba($color-primary, 0.1);
  }
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 8px 12px;
  font-size: 14px;
  background: transparent;
  
  &::placeholder {
    color: $color-text-secondary;
  }
}

.search-button {
  background: $color-primary;
  border: none;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.3s ease;
  
  &:hover {
    background: darken($color-primary, 10%);
  }
  
  &:active {
    background: darken($color-primary, 20%);
  }
}

.search-icon {
  width: 16px;
  height: 16px;
  color: $color-white;
}

.suggestions-dropdown,
.search-history {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: $color-white;
  border: 1px solid $color-border;
  border-radius: 6px;
  box-shadow: $shadow-medium;
  z-index: 1000;
  margin-top: 4px;
  max-height: 300px;
  overflow-y: auto;
}

.suggestion-item {
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s ease;
  border-bottom: 1px solid $color-border-light;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover,
  &.active {
    background: $color-bg-hover;
  }
}

.suggestion-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.suggestion-text {
  color: $color-text;
  font-size: 14px;
}

.suggestion-type {
  color: $color-text-secondary;
  font-size: 12px;
  background: $color-bg-light;
  padding: 2px 6px;
  border-radius: 3px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid $color-border-light;
  font-size: 14px;
  color: $color-text-secondary;
}

.clear-history {
  background: none;
  border: none;
  color: $color-primary;
  cursor: pointer;
  font-size: 12px;
  
  &:hover {
    text-decoration: underline;
  }
}

.history-list {
  padding: 8px 0;
}

.history-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.2s ease;
  
  &:hover {
    background: $color-bg-hover;
  }
}

.history-icon {
  width: 14px;
  height: 14px;
  margin-right: 8px;
  color: $color-text-secondary;
}

.history-text {
  flex: 1;
  color: $color-text;
  font-size: 14px;
}

.remove-history {
  background: none;
  border: none;
  color: $color-text-secondary;
  cursor: pointer;
  font-size: 16px;
  padding: 0 4px;
  
  &:hover {
    color: $color-error;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .search-bar {
    &.size-medium,
    &.size-large {
      .search-input-container {
        max-width: 100%;
      }
    }
  }
  
  .suggestions-dropdown,
  .search-history {
    position: fixed;
    top: 120px;
    left: 16px;
    right: 16px;
    max-height: 50vh;
  }
}
</style>