import { createApp } from 'veaury'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import { Provider } from 'react-redux'
import { store } from './stores/reduxStore'

// 引入全局样式
import './styles/global.scss'

// 引入UI组件库样式
import 'element-plus/dist/index.css'
import 'antd/dist/reset.css'

// 创建Vue应用
const app = createApp(App)

// 使用Pinia状态管理
const pinia = createPinia()
app.use(pinia)

// 使用路由
app.use(router)

// 包装React Redux Provider
const WrappedApp = () => (
  <Provider store={store}>
    <app />
  </Provider>
)

// 挂载应用
app.mount('#app')