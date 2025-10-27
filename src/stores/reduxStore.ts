import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { AppState, UIState, SearchState, MessageState } from '@types/index'

// UI状态切片
const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    theme: 'light',
    sidebarCollapsed: false,
    loading: false,
    modalOpen: false,
    currentModal: ''
  } as UIState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload
      localStorage.setItem('theme', action.payload)
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    openModal: (state, action: PayloadAction<string>) => {
      state.modalOpen = true
      state.currentModal = action.payload
    },
    closeModal: (state) => {
      state.modalOpen = false
      state.currentModal = ''
    }
  }
})

// 搜索状态切片
const searchSlice = createSlice({
  name: 'search',
  initialState: {
    keyword: '',
    results: [],
    history: [],
    searching: false
  } as SearchState,
  reducers: {
    setKeyword: (state, action: PayloadAction<string>) => {
      state.keyword = action.payload
    },
    setResults: (state, action: PayloadAction<any[]>) => {
      state.results = action.payload
      state.searching = false
    },
    setSearching: (state, action: PayloadAction<boolean>) => {
      state.searching = action.payload
    },
    addToHistory: (state, action: PayloadAction<string>) => {
      if (!state.history.includes(action.payload)) {
        state.history.unshift(action.payload)
        // 保持最多10条历史记录
        if (state.history.length > 10) {
          state.history.pop()
        }
      }
    },
    clearHistory: (state) => {
      state.history = []
    }
  }
})

// 消息状态切片
const messageSlice = createSlice({
  name: 'message',
  initialState: {
    unreadCount: 0,
    messages: [],
    notifications: []
  } as MessageState,
  reducers: {
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload
    },
    addMessage: (state, action: PayloadAction<any>) => {
      state.messages.unshift(action.payload)
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const message = state.messages.find(m => m.id === action.payload)
      if (message && !message.read) {
        message.read = true
        state.unreadCount = Math.max(0, state.unreadCount - 1)
      }
    },
    addNotification: (state, action: PayloadAction<any>) => {
      state.notifications.unshift(action.payload)
    },
    clearNotifications: (state) => {
      state.notifications = []
    }
  }
})

// 配置Store
export const store = configureStore({
  reducer: {
    ui: uiSlice.reducer,
    search: searchSlice.reducer,
    message: messageSlice.reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST']
      }
    })
})

// 导出actions
export const {
  setTheme,
  toggleSidebar,
  setLoading,
  openModal,
  closeModal
} = uiSlice.actions

export const {
  setKeyword,
  setResults,
  setSearching,
  addToHistory,
  clearHistory
} = searchSlice.actions

export const {
  setUnreadCount,
  addMessage,
  markAsRead,
  addNotification,
  clearNotifications
} = messageSlice.actions

// 类型导出
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch