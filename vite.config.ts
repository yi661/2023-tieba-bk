import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import react from '@vitejs/plugin-react'
import { veauryVitePlugins } from 'veaury/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    // 使用Veaury插件支持Vue和React混合开发
    ...veauryVitePlugins({
      // Vue配置
      vue: {
        template: {
          compilerOptions: {
            isCustomElement: (tag) => tag.startsWith('tieba-')
          }
        }
      },
      // React配置
      react: {
        jsxRuntime: 'automatic'
      },
      // 共享配置
      shared: {
        // 共享的依赖
        sharedDeps: ['axios', 'dayjs'],
        // 样式共享
        sharedStyles: ['@/styles/global.scss']
      }
    })
  ],
  
  // 路径别名配置
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@pages': resolve(__dirname, 'src/pages'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@stores': resolve(__dirname, 'src/stores'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@types': resolve(__dirname, 'src/types'),
      '@assets': resolve(__dirname, 'src/assets')
    }
  },
  
  // 开发服务器配置
  server: {
    port: 3000,
    host: true,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  
  // 构建配置
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['element-plus', 'antd']
        }
      }
    }
  },
  
  // CSS配置
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    }
  },
  
  // 环境变量配置
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false
  }
})