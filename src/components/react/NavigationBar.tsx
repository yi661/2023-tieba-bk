import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Link, useLocation } from 'react-router-dom'
import { Button, Dropdown, Menu, Avatar, Badge, Input } from 'antd'
import {
  SearchOutlined,
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined
} from '@ant-design/icons'
import type { RootState } from '@/stores/reduxStore'
import { setKeyword, addToHistory } from '@/stores/reduxStore'

const NavigationBar: React.FC = () => {
  const dispatch = useDispatch()
  const location = useLocation()
  const { userInfo, isLoggedIn } = useSelector((state: RootState) => state.user)
  const { unreadCount } = useSelector((state: RootState) => state.message)
  const { keyword } = useSelector((state: RootState) => state.search)
  
  const [searchVisible, setSearchVisible] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleSearch = (value: string) => {
    if (value.trim()) {
      dispatch(setKeyword(value))
      dispatch(addToHistory(value))
      // 跳转到搜索页面
      window.location.href = `/search?keyword=${encodeURIComponent(value)}`
    }
  }

  const userMenu = (
    <Menu
      items={[
        {
          key: 'profile',
          label: (
            <Link to="/profile">
              <UserOutlined /> 个人中心
            </Link>
          )
        },
        {
          key: 'settings',
          label: (
            <Link to="/settings">
              <SettingOutlined /> 设置
            </Link>
          )
        },
        { type: 'divider' },
        {
          key: 'logout',
          label: (
            <span onClick={handleLogout}>
              <LogoutOutlined /> 退出登录
            </span>
          )
        }
      ]}
    />
  )

  const handleLogout = () => {
    // 清除用户信息
    localStorage.removeItem('token')
    window.location.reload()
  }

  return (
    <nav className="navigation-bar">
      <div className="nav-container">
        {/* Logo和品牌 */}
        <div className="nav-brand">
          <Link to="/" className="logo">
            <img src="/logo.png" alt="百度贴吧" />
            <span className="brand-name">百度贴吧</span>
          </Link>
        </div>

        {/* 主导航 */}
        <div className="nav-menu">
          <Link 
            to="/" 
            className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}
          >
            首页
          </Link>
          <Link 
            to="/tiebas" 
            className={`nav-item ${location.pathname.startsWith('/tieba') ? 'active' : ''}`}
          >
            贴吧
          </Link>
          <Link 
            to="/hot" 
            className={`nav-item ${location.pathname === '/hot' ? 'active' : ''}`}
          >
            热门
          </Link>
        </div>

        {/* 搜索框 */}
        <div className="nav-search">
          {isMobile ? (
            <Button 
              type="text" 
              icon={<SearchOutlined />} 
              onClick={() => setSearchVisible(true)}
            />
          ) : (
            <Input.Search
              placeholder="搜索贴吧、帖子、用户..."
              value={keyword}
              onChange={(e) => dispatch(setKeyword(e.target.value))}
              onSearch={handleSearch}
              style={{ width: 300 }}
              enterButton={<SearchOutlined />}
            />
          )}
        </div>

        {/* 用户操作区域 */}
        <div className="nav-actions">
          {isLoggedIn ? (
            <>
              {/* 消息通知 */}
              <Badge count={unreadCount} size="small">
                <Button 
                  type="text" 
                  icon={<BellOutlined />} 
                  className="nav-action-btn"
                />
              </Badge>
              
              {/* 用户头像和菜单 */}
              <Dropdown overlay={userMenu} placement="bottomRight">
                <div className="user-avatar">
                  <Avatar 
                    src={userInfo?.avatar} 
                    icon={<UserOutlined />}
                    size="default"
                  />
                  {!isMobile && (
                    <span className="username">
                      {userInfo?.nickname || userInfo?.username}
                    </span>
                  )}
                </div>
              </Dropdown>
              
              {/* 发帖按钮 */}
              <Link to="/post/create">
                <Button type="primary" size="small">
                  发帖
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button type="text" size="small">
                  登录
                </Button>
              </Link>
              <Link to="/register">
                <Button type="primary" size="small">
                  注册
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* 移动端搜索模态框 */}
      {searchVisible && isMobile && (
        <div className="mobile-search-modal">
          <div className="search-header">
            <Input.Search
              placeholder="搜索贴吧、帖子、用户..."
              autoFocus
              onSearch={(value) => {
                handleSearch(value)
                setSearchVisible(false)
              }}
              enterButton="搜索"
            />
            <Button 
              type="text" 
              onClick={() => setSearchVisible(false)}
            >
              取消
            </Button>
          </div>
        </div>
      )}

      <style jsx>{`
        .navigation-bar {
          background: white;
          border-bottom: 1px solid #f0f0f0;
          position: sticky;
          top: 0;
          z-index: 1000;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }
        
        .nav-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          padding: 0 20px;
          height: 64px;
        }
        
        .nav-brand {
          margin-right: 2rem;
        }
        
        .logo {
          display: flex;
          align-items: center;
          text-decoration: none;
          color: #1890ff;
          font-weight: 600;
          font-size: 1.2rem;
        }
        
        .logo img {
          height: 32px;
          margin-right: 8px;
        }
        
        .nav-menu {
          display: flex;
          gap: 2rem;
          margin-right: auto;
        }
        
        .nav-item {
          padding: 8px 16px;
          text-decoration: none;
          color: #666;
          border-radius: 6px;
          transition: all 0.3s;
        }
        
        .nav-item:hover,
        .nav-item.active {
          color: #1890ff;
          background: #f0f8ff;
        }
        
        .nav-search {
          margin-right: 1rem;
        }
        
        .nav-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .nav-action-btn {
          border: none;
          background: transparent;
        }
        
        .user-avatar {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          transition: background 0.3s;
        }
        
        .user-avatar:hover {
          background: #f5f5f5;
        }
        
        .username {
          font-size: 14px;
          color: #333;
        }
        
        .mobile-search-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: white;
          z-index: 2000;
          padding: 20px;
        }
        
        .search-header {
          display: flex;
          gap: 1rem;
          align-items: center;
        }
        
        @media (max-width: 768px) {
          .nav-container {
            padding: 0 16px;
          }
          
          .nav-menu {
            display: none;
          }
          
          .nav-search {
            margin-right: 0;
          }
          
          .username {
            display: none;
          }
        }
      `}</style>
    </nav>
  )
}

export default NavigationBar