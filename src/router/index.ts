import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

// 路由配置
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@pages/HomePage.vue'),
    meta: {
      title: '百度贴吧 - 首页',
      keepAlive: true
    }
  },
  {
    path: '/tieba/:id',
    name: 'TiebaDetail',
    component: () => import('@pages/TiebaDetailPage.vue'),
    meta: {
      title: '贴吧详情',
      requiresAuth: false
    }
  },
  {
    path: '/post/create',
    name: 'CreatePost',
    component: () => import('@pages/CreatePostPage.vue'),
    meta: {
      title: '发帖',
      requiresAuth: true
    }
  },
  {
    path: '/post/:id',
    name: 'PostDetail',
    component: () => import('@pages/PostDetailPage.vue'),
    meta: {
      title: '帖子详情',
      requiresAuth: false
    }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@pages/ProfilePage.vue'),
    meta: {
      title: '个人中心',
      requiresAuth: true
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@pages/LoginPage.vue'),
    meta: {
      title: '登录',
      requiresAuth: false
    }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@pages/RegisterPage.vue'),
    meta: {
      title: '注册',
      requiresAuth: false
    }
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('@pages/SearchPage.vue'),
    meta: {
      title: '搜索',
      requiresAuth: false
    }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@pages/NotFoundPage.vue'),
    meta: {
      title: '页面未找到'
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  if (to.meta.title) {
    document.title = to.meta.title as string
  }
  
  // 检查是否需要登录
  if (to.meta.requiresAuth) {
    const isLoggedIn = localStorage.getItem('token')
    if (!isLoggedIn) {
      next('/login')
      return
    }
  }
  
  next()
})

router.afterEach((to, from) => {
  // 页面访问统计
  console.log(`Navigated to: ${to.path}`)
})

export default router