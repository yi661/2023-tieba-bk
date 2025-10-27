<template>
  <div class="home-page">
    <!-- 导航栏组件 (React) -->
    <NavigationBar />
    
    <!-- 英雄区域 -->
    <section class="hero-section">
      <div class="container">
        <h1 class="hero-title">欢迎来到百度贴吧</h1>
        <p class="hero-subtitle">发现你感兴趣的社区，与志同道合的人交流</p>
        
        <!-- 搜索组件 (Vue) -->
        <SearchBar @search="handleSearch" />
      </div>
    </section>
    
    <!-- 主要内容区域 -->
    <main class="main-content">
      <div class="container">
        <div class="content-grid">
          <!-- 热门贴吧区域 -->
          <section class="hot-tiebas-section">
            <h2 class="section-title">热门贴吧</h2>
            <!-- 贴吧列表组件 (React) -->
            <TiebaList :tiebas="hotTiebas" @tieba-click="handleTiebaClick" />
          </section>
          
          <!-- 热门帖子区域 -->
          <section class="hot-posts-section">
            <h2 class="section-title">热门帖子</h2>
            <!-- 帖子列表组件 (Vue) -->
            <PostList :posts="hotPosts" @post-click="handlePostClick" />
          </section>
          
          <!-- 侧边栏 -->
          <aside class="sidebar">
            <!-- 用户信息卡片 (React) -->
            <UserInfoCard v-if="isLoggedIn" />
            
            <!-- 推荐贴吧 (Vue) -->
            <RecommendedTiebas :tiebas="recommendedTiebas" />
            
            <!-- 公告组件 (React) -->
            <AnnouncementList :announcements="announcements" />
          </aside>
        </div>
      </div>
    </main>
    
    <!-- 底部导航 (移动端) -->
    <BottomNavigation />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/piniaStore'
import { useTiebaStore } from '@/stores/piniaStore'
import { usePostStore } from '@/stores/piniaStore'

// 导入React组件
import NavigationBar from '@/components/react/NavigationBar'
import TiebaList from '@/components/react/TiebaList'
import UserInfoCard from '@/components/react/UserInfoCard'
import AnnouncementList from '@/components/react/AnnouncementList'
import BottomNavigation from '@/components/react/BottomNavigation'

// 导入Vue组件
import SearchBar from '@/components/vue/SearchBar.vue'
import PostList from '@/components/vue/PostList.vue'
import RecommendedTiebas from '@/components/vue/RecommendedTiebas.vue'

// 响应式数据
const router = useRouter()
const userStore = useUserStore()
const tiebaStore = useTiebaStore()
const postStore = usePostStore()

const hotTiebas = ref([])
const hotPosts = ref([])
const recommendedTiebas = ref([])
const announcements = ref([])

const isLoggedIn = ref(userStore.isLoggedIn)

// 生命周期
onMounted(async () => {
  await loadHomeData()
})

// 方法
const loadHomeData = async () => {
  try {
    // 加载热门贴吧
    await tiebaStore.fetchTiebaList()
    hotTiebas.value = tiebaStore.tiebaList.slice(0, 10)
    
    // 加载热门帖子
    await postStore.fetchPosts()
    hotPosts.value = postStore.postList.slice(0, 15)
    
    // 加载推荐贴吧
    recommendedTiebas.value = tiebaStore.tiebaList.slice(10, 15)
    
    // 加载公告
    announcements.value = [
      { id: 1, title: '系统维护通知', content: '今晚23:00-24:00进行系统维护', time: '2024-01-15' },
      { id: 2, title: '新功能上线', content: '新增贴吧搜索功能', time: '2024-01-10' }
    ]
  } catch (error) {
    console.error('加载首页数据失败:', error)
  }
}

const handleSearch = (keyword: string) => {
  router.push(`/search?keyword=${encodeURIComponent(keyword)}`)
}

const handleTiebaClick = (tieba: any) => {
  router.push(`/tieba/${tieba.id}`)
}

const handlePostClick = (post: any) => {
  router.push(`/post/${post.id}`)
}
</script>

<style scoped lang="scss">
.home-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.hero-section {
  padding: 80px 0 60px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.9) 100%);
  color: white;
  text-align: center;
  
  .hero-title {
    font-size: 3rem;
    font-weight: 700;
    margin-bottom: 1rem;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
  
  .hero-subtitle {
    font-size: 1.2rem;
    margin-bottom: 2rem;
    opacity: 0.9;
  }
}

.main-content {
  padding: 40px 0;
  background: var(--background-secondary);
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 2rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
}

.hot-tiebas-section,
.hot-posts-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--shadow-md);
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--text-primary);
  border-bottom: 2px solid var(--primary-color);
  padding-bottom: 0.5rem;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  
  @media (max-width: 1024px) {
    display: none;
  }
}

@media (max-width: 768px) {
  .hero-section {
    padding: 60px 0 40px;
    
    .hero-title {
      font-size: 2rem;
    }
    
    .hero-subtitle {
      font-size: 1rem;
    }
  }
  
  .main-content {
    padding: 20px 0;
  }
  
  .hot-tiebas-section,
  .hot-posts-section {
    padding: 1rem;
    border-radius: 8px;
  }
}
</style>