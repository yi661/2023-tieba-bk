<template>
  <div class="post-list">
    <!-- 列表头部 -->
    <div v-if="title" class="list-header">
      <h3 class="list-title">{{ title }}</h3>
      <div v-if="showTabs" class="list-tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.value"
          :class="['tab-button', { active: activeTab === tab.value }]"
          @click="handleTabChange(tab.value)"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading && posts.length === 0" class="loading-container">
      <div class="loading-spinner"></div>
      <span>加载中...</span>
    </div>

    <!-- 帖子列表 -->
    <div v-else-if="posts.length > 0" class="posts-container">
      <div 
        v-for="post in displayedPosts" 
        :key="post.id"
        class="post-item"
        @click="handlePostClick(post)"
      >
        <!-- 帖子头部 -->
        <div class="post-header">
          <div class="author-info">
            <img 
              :src="post.author.avatar" 
              :alt="post.author.nickname"
              class="author-avatar"
            />
            <div class="author-details">
              <span class="author-name">{{ post.author.nickname }}</span>
              <span class="post-time">{{ formatTime(post.createTime) }}</span>
            </div>
          </div>
          <div class="post-meta">
            <span class="tieba-name">{{ post.tiebaName }}</span>
            <div class="interaction-counts">
              <span class="count-item">
                <EyeIcon class="count-icon" />
                {{ formatNumber(post.viewCount) }}
              </span>
              <span class="count-item">
                <CommentIcon class="count-icon" />
                {{ formatNumber(post.commentCount) }}
              </span>
              <span class="count-item">
                <LikeIcon class="count-icon" />
                {{ formatNumber(post.likeCount) }}
              </span>
            </div>
          </div>
        </div>

        <!-- 帖子内容 -->
        <div class="post-content">
          <h4 class="post-title">{{ post.title }}</h4>
          <p class="post-summary">{{ post.content }}</p>
          
          <!-- 图片预览 -->
          <div v-if="post.images && post.images.length > 0" class="post-images">
            <img 
              v-for="(image, index) in post.images.slice(0, 3)" 
              :key="index"
              :src="image" 
              :alt="`图片${index + 1}`"
              class="post-image"
              @click.stop="handleImagePreview(post.images, index)"
            />
            <span v-if="post.images.length > 3" class="image-count">
              +{{ post.images.length - 3 }}
            </span>
          </div>
        </div>

        <!-- 帖子标签 -->
        <div v-if="post.tags && post.tags.length > 0" class="post-tags">
          <span 
            v-for="tag in post.tags" 
            :key="tag"
            class="post-tag"
          >
            {{ tag }}
          </span>
        </div>

        <!-- 帖子操作 -->
        <div class="post-actions">
          <button 
            :class="['action-button', { active: post.isLiked }]"
            @click.stop="handleLike(post)"
          >
            <LikeIcon class="action-icon" />
            {{ post.isLiked ? '已赞' : '点赞' }}
          </button>
          <button class="action-button" @click.stop="handleComment(post)">
            <CommentIcon class="action-icon" />
            评论
          </button>
          <button class="action-button" @click.stop="handleShare(post)">
            <ShareIcon class="action-icon" />
            分享
          </button>
          <button class="action-button" @click.stop="handleCollect(post)">
            <CollectIcon class="action-icon" />
            {{ post.isCollected ? '已收藏' : '收藏' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-container">
      <div class="empty-icon">📝</div>
      <p class="empty-text">暂无帖子</p>
      <button v-if="showCreateButton" class="create-button" @click="handleCreatePost">
        创建第一个帖子
      </button>
    </div>

    <!-- 加载更多 -->
    <div v-if="hasMore && !loading" class="load-more">
      <button class="load-more-button" @click="loadMore">
        加载更多
      </button>
    </div>

    <!-- 分页器 -->
    <div v-if="showPagination && total > pageSize" class="pagination">
      <button 
        :disabled="currentPage === 1"
        class="pagination-button"
        @click="handlePageChange(currentPage - 1)"
      >
        上一页
      </button>
      
      <span class="pagination-info">
        第 {{ currentPage }} 页 / 共 {{ totalPages }} 页
      </span>
      
      <button 
        :disabled="currentPage === totalPages"
        class="pagination-button"
        @click="handlePageChange(currentPage + 1)"
      >
        下一页
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '@/stores/piniaStore'
import type { PostInfo } from '@/types'
import { EyeIcon, CommentIcon, LikeIcon, ShareIcon, CollectIcon } from '@/components/icons'

interface Props {
  title?: string
  type?: 'hot' | 'latest' | 'recommend' | 'followed'
  tiebaId?: string
  userId?: string
  pageSize?: number
  showTabs?: boolean
  showPagination?: boolean
  showCreateButton?: boolean
  autoLoad?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '热门帖子',
  type: 'hot',
  pageSize: 10,
  showTabs: true,
  showPagination: false,
  showCreateButton: false,
  autoLoad: true
})

const emit = defineEmits<{
  'post-click': [post: PostInfo]
  'post-like': [post: PostInfo]
  'post-comment': [post: PostInfo]
  'post-share': [post: PostInfo]
  'post-collect': [post: PostInfo]
  'create-post': []
}>()

const router = useRouter()
const store = useStore()

const posts = ref<PostInfo[]>([])
const loading = ref(false)
const currentPage = ref(1)
const total = ref(0)
const activeTab = ref(props.type)

// 标签配置
const tabs = [
  { label: '热门', value: 'hot' },
  { label: '最新', value: 'latest' },
  { label: '推荐', value: 'recommend' },
  { label: '关注', value: 'followed' }
]

// 计算属性
const displayedPosts = computed(() => {
  const start = (currentPage.value - 1) * props.pageSize
  const end = start + props.pageSize
  return posts.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(total.value / props.pageSize)
})

const hasMore = computed(() => {
  return currentPage.value < totalPages.value
})

// 监听器
watch(() => props.type, (newType) => {
  activeTab.value = newType
  if (props.autoLoad) {
    fetchPosts()
  }
})

watch(() => props.tiebaId, () => {
  if (props.autoLoad) {
    fetchPosts()
  }
})

// 生命周期
if (props.autoLoad) {
  fetchPosts()
}

// 获取帖子列表
const fetchPosts = async () => {
  loading.value = true
  try {
    // 模拟API调用
    const mockPosts: PostInfo[] = [
      {
        id: '1',
        title: '英雄联盟新版本更新内容详解',
        content: '本次更新主要调整了英雄平衡性和装备系统，具体改动如下...',
        author: {
          id: '101',
          username: 'lol_player',
          nickname: '峡谷召唤师',
          avatar: '/avatars/user1.jpg'
        },
        tiebaId: '1',
        tiebaName: '英雄联盟',
        viewCount: 12500,
        commentCount: 234,
        likeCount: 567,
        isLiked: false,
        isCollected: false,
        images: ['/posts/lol1.jpg', '/posts/lol2.jpg'],
        tags: ['游戏', '更新', '攻略'],
        createTime: '2024-01-15T10:30:00Z',
        updateTime: '2024-01-15T10:30:00Z'
      },
      {
        id: '2',
        title: '考研数学复习经验分享',
        content: '作为去年成功上岸的考生，分享一下数学复习的一些心得和方法...',
        author: {
          id: '102',
          username: 'kaoyan_success',
          nickname: '考研上岸者',
          avatar: '/avatars/user2.jpg'
        },
        tiebaId: '2',
        tiebaName: '考研',
        viewCount: 8900,
        commentCount: 156,
        likeCount: 289,
        isLiked: true,
        isCollected: true,
        images: ['/posts/kaoyan1.jpg'],
        tags: ['教育', '经验', '数学'],
        createTime: '2024-01-14T14:20:00Z',
        updateTime: '2024-01-14T14:20:00Z'
      },
      {
        id: '3',
        title: '最新电影《流浪地球3》观后感',
        content: '刚看完点映，特效震撼，剧情紧凑，值得一看！以下是无剧透评价...',
        author: {
          id: '103',
          username: 'movie_lover',
          nickname: '电影爱好者',
          avatar: '/avatars/user3.jpg'
        },
        tiebaId: '3',
        tiebaName: '电影',
        viewCount: 6700,
        commentCount: 89,
        likeCount: 234,
        isLiked: false,
        isCollected: false,
        images: ['/posts/movie1.jpg', '/posts/movie2.jpg', '/posts/movie3.jpg'],
        tags: ['娱乐', '影评', '科幻'],
        createTime: '2024-01-13T20:15:00Z',
        updateTime: '2024-01-13T20:15:00Z'
      }
    ]
    
    posts.value = mockPosts
    total.value = mockPosts.length
  } catch (error) {
    console.error('获取帖子列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 事件处理
const handleTabChange = (tab: string) => {
  activeTab.value = tab
  currentPage.value = 1
  fetchPosts()
}

const handlePostClick = (post: PostInfo) => {
  emit('post-click', post)
  router.push(`/post/${post.id}`)
}

const handleLike = async (post: PostInfo) => {
  try {
    // 模拟点赞API调用
    const updatedPost = { ...post, isLiked: !post.isLiked }
    posts.value = posts.value.map(p => p.id === post.id ? updatedPost : p)
    emit('post-like', updatedPost)
  } catch (error) {
    console.error('点赞操作失败:', error)
  }
}

const handleComment = (post: PostInfo) => {
  emit('post-comment', post)
}

const handleShare = (post: PostInfo) => {
  emit('post-share', post)
}

const handleCollect = (post: PostInfo) => {
  emit('post-collect', post)
}

const handleCreatePost = () => {
  emit('create-post')
  router.push('/post/create')
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  fetchPosts()
}

const loadMore = () => {
  currentPage.value += 1
  fetchPosts()
}

const handleImagePreview = (images: string[], index: number) => {
  // 图片预览逻辑
  console.log('预览图片:', images, index)
}

// 工具函数
const formatTime = (time: string): string => {
  const now = new Date()
  const postTime = new Date(time)
  const diff = now.getTime() - postTime.getTime()
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  
  return postTime.toLocaleDateString()
}

const formatNumber = (num: number): string => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num.toString()
}
</script>

<style scoped lang="scss">
@import '@/styles/variables.scss';

.post-list {
  width: 100%;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid $color-border;
}

.list-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: $color-text;
}

.list-tabs {
  display: flex;
  gap: 8px;
}

.tab-button {
  padding: 6px 16px;
  border: 1px solid $color-border;
  border-radius: 6px;
  background: $color-white;
  color: $color-text-secondary;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
  
  &:hover {
    border-color: $color-primary;
    color: $color-primary;
  }
  
  &.active {
    background: $color-primary;
    border-color: $color-primary;
    color: $color-white;
  }
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 0;
  color: $color-text-secondary;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid $color-border;
  border-top: 3px solid $color-primary;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.posts-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.post-item {
  background: $color-white;
  border: 1px solid $color-border;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: $color-primary;
    box-shadow: $shadow-small;
  }
}

.post-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.author-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.author-details {
  display: flex;
  flex-direction: column;
}

.author-name {
  font-size: 14px;
  font-weight: 500;
  color: $color-text;
}

.post-time {
  font-size: 12px;
  color: $color-text-secondary;
}

.post-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.tieba-name {
  font-size: 12px;
  color: $color-primary;
  background: $color-bg-light;
  padding: 2px 6px;
  border-radius: 3px;
}

.interaction-counts {
  display: flex;
  gap: 12px;
}

.count-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: $color-text-secondary;
}

.count-icon {
  width: 12px;
  height: 12px;
}

.post-content {
  margin-bottom: 12px;
}

.post-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: $color-text;
  line-height: 1.4;
}

.post-summary {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: $color-text-secondary;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-images {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.post-image {
  width: 80px;
  height: 80px;
  border-radius: 4px;
  object-fit: cover;
  cursor: pointer;
  transition: transform 0.3s ease;
  
  &:hover {
    transform: scale(1.05);
  }
}

.image-count {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: $color-bg-light;
  border-radius: 4px;
  color: $color-text-secondary;
  font-size: 14px;
}

.post-tags {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.post-tag {
  padding: 2px 6px;
  background: $color-bg-light;
  color: $color-text-secondary;
  border-radius: 3px;
  font-size: 12px;
}

.post-actions {
  display: flex;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid $color-border-light;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: $color-text-secondary;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
  padding: 4px 8px;
  border-radius: 4px;
  
  &:hover {
    background: $color-bg-hover;
    color: $color-primary;
  }
  
  &.active {
    color: $color-primary;
  }
}

.action-icon {
  width: 14px;
  height: 14px;
}

.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 0;
  color: $color-text-secondary;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-text {
  margin: 0 0 16px 0;
  font-size: 14px;
}

.create-button {
  padding: 8px 16px;
  background: $color-primary;
  color: $color-white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s ease;
  
  &:hover {
    background: darken($color-primary, 10%);
  }
}

.load-more {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.load-more-button {
  padding: 8px 24px;
  background: $color-white;
  border: 1px solid $color-border;
  border-radius: 6px;
  color: $color-text;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: $color-primary;
    color: $color-primary;
  }
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid $color-border;
}

.pagination-button {
  padding: 6px 12px;
  background: $color-white;
  border: 1px solid $color-border;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover:not(:disabled) {
    border-color: $color-primary;
    color: $color-primary;
  }
  
  &:disabled {
    background: $color-bg-light;
    color: $color-text-disabled;
    cursor: not-allowed;
  }
}

.pagination-info {
  font-size: 14px;
  color: $color-text-secondary;
}

// 响应式设计
@media (max-width: 768px) {
  .list-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .post-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .post-meta {
    align-items: flex-start;
  }
  
  .post-actions {
    justify-content: space-around;
  }
  
  .pagination {
    flex-direction: column;
    gap: 12px;
  }
}
</style>