import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, Avatar, Button, List, Tag, Divider } from 'antd'
import { 
  FireOutlined, 
  StarOutlined, 
  UserOutlined, 
  MessageOutlined,
  TrophyOutlined,
  CalendarOutlined
} from '@ant-design/icons'
import type { TiebaInfo, UserInfo } from '@/types'

interface Props {
  position?: 'left' | 'right'
  showUserInfo?: boolean
  showHotTiebas?: boolean
  showRanking?: boolean
  showCalendar?: boolean
}

const Sidebar: React.FC<Props> = ({
  position = 'right',
  showUserInfo = true,
  showHotTiebas = true,
  showRanking = true,
  showCalendar = true
}) => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [hotTiebas, setHotTiebas] = useState<TiebaInfo[]>([])
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    // 模拟获取用户信息
    const mockUser: UserInfo = {
      id: '123',
      username: 'testuser',
      nickname: '测试用户',
      avatar: '/avatars/default.jpg',
      level: 15,
      experience: 12500,
      followCount: 234,
      fansCount: 567,
      postCount: 89,
      signature: '热爱生活，热爱编程',
      joinTime: '2023-01-01',
      isOnline: true
    }
    
    setUserInfo(mockUser)
    setIsLoggedIn(true)
    
    // 模拟获取热门贴吧
    const mockHotTiebas: TiebaInfo[] = [
      {
        id: '1',
        name: '英雄联盟',
        avatar: '/tieba/lol.jpg',
        memberCount: 12500000,
        postCount: 56800000,
        description: '',
        isFollowed: false,
        todayPostCount: 12500,
        category: '游戏',
        createTime: '2010-05-22'
      },
      {
        id: '2',
        name: '考研',
        avatar: '/tieba/kaoyan.jpg',
        memberCount: 8900000,
        postCount: 23400000,
        description: '',
        isFollowed: true,
        todayPostCount: 8900,
        category: '教育',
        createTime: '2009-08-15'
      },
      {
        id: '3',
        name: '电影',
        avatar: '/tieba/movie.jpg',
        memberCount: 7600000,
        postCount: 18900000,
        description: '',
        isFollowed: false,
        todayPostCount: 5600,
        category: '娱乐',
        createTime: '2008-12-03'
      }
    ]
    
    setHotTiebas(mockHotTiebas)
  }, [])

  const formatNumber = (num: number): string => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万'
    }
    return num.toString()
  }

  const getRankingList = () => [
    { rank: 1, name: '英雄联盟', heat: 12500 },
    { rank: 2, name: '考研', heat: 8900 },
    { rank: 3, name: '电影', heat: 5600 },
    { rank: 4, name: '健身', heat: 3400 },
    { rank: 5, name: '编程', heat: 2800 }
  ]

  const getCalendarEvents = () => [
    { date: '01-15', event: '英雄联盟新版本更新' },
    { date: '01-16', event: '考研倒计时100天' },
    { date: '01-18', event: '电影《流浪地球3》上映' }
  ]

  return (
    <aside className={`sidebar sidebar-${position}`}>
      {/* 用户信息卡片 */}
      {showUserInfo && isLoggedIn && userInfo && (
        <Card className="user-card" size="small">
          <div className="user-header">
            <Avatar 
              src={userInfo.avatar} 
              icon={<UserOutlined />}
              size={48}
              className="user-avatar"
            />
            <div className="user-details">
              <h4 className="user-name">{userInfo.nickname}</h4>
              <div className="user-level">
                <Tag color="blue">Lv.{userInfo.level}</Tag>
                <span className="user-exp">经验: {formatNumber(userInfo.experience)}</span>
              </div>
            </div>
          </div>
          
          <p className="user-signature">{userInfo.signature}</p>
          
          <div className="user-stats">
            <div className="stat-item">
              <span className="stat-label">关注</span>
              <span className="stat-value">{formatNumber(userInfo.followCount)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">粉丝</span>
              <span className="stat-value">{formatNumber(userInfo.fansCount)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">帖子</span>
              <span className="stat-value">{formatNumber(userInfo.postCount)}</span>
            </div>
          </div>
          
          <div className="user-actions">
            <Link to="/profile">
              <Button type="primary" size="small" block>
                个人中心
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {!isLoggedIn && (
        <Card className="login-card" size="small">
          <div className="login-prompt">
            <UserOutlined className="login-icon" />
            <p>登录后享受更多功能</p>
            <div className="login-buttons">
              <Link to="/login">
                <Button type="primary" size="small">登录</Button>
              </Link>
              <Link to="/register">
                <Button size="small">注册</Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* 热门贴吧 */}
      {showHotTiebas && (
        <Card 
          title={
            <span>
              <FireOutlined /> 热门贴吧
            </span>
          }
          size="small"
          className="hot-tiebas-card"
        >
          <List
            dataSource={hotTiebas}
            renderItem={(tieba) => (
              <List.Item className="tieba-item">
                <Link to={`/tieba/${tieba.id}`} className="tieba-link">
                  <Avatar 
                    src={tieba.avatar} 
                    icon={<UserOutlined />}
                    size="small"
                  />
                  <div className="tieba-info">
                    <span className="tieba-name">{tieba.name}</span>
                    <span className="tieba-stats">
                      {formatNumber(tieba.memberCount)} 关注
                    </span>
                  </div>
                </Link>
                <Button 
                  type={tieba.isFollowed ? "default" : "primary"}
                  size="small"
                  icon={<StarOutlined />}
                >
                  {tieba.isFollowed ? '已关注' : '关注'}
                </Button>
              </List.Item>
            )}
          />
          <div className="card-footer">
            <Link to="/tiebas">
              <Button type="link" size="small">查看更多贴吧</Button>
            </Link>
          </div>
        </Card>
      )}

      <Divider />

      {/* 贴吧排名 */}
      {showRanking && (
        <Card 
          title={
            <span>
              <TrophyOutlined /> 贴吧热度榜
            </span>
          }
          size="small"
          className="ranking-card"
        >
          <List
            dataSource={getRankingList()}
            renderItem={(item, index) => (
              <List.Item className="ranking-item">
                <div className="ranking-info">
                  <span className={`ranking-number ranking-${item.rank}`}>
                    {item.rank}
                  </span>
                  <span className="ranking-name">{item.name}</span>
                </div>
                <span className="ranking-heat">
                  <FireOutlined /> {formatNumber(item.heat)}
                </span>
              </List.Item>
            )}
          />
        </Card>
      )}

      <Divider />

      {/* 贴吧日历 */}
      {showCalendar && (
        <Card 
          title={
            <span>
              <CalendarOutlined /> 贴吧日历
            </span>
          }
          size="small"
          className="calendar-card"
        >
          <List
            dataSource={getCalendarEvents()}
            renderItem={(event) => (
              <List.Item className="calendar-item">
                <div className="event-date">{event.date}</div>
                <div className="event-content">{event.event}</div>
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* 底部信息 */}
      <div className="sidebar-footer">
        <p className="footer-links">
          <a href="#">关于我们</a>
          <span>·</span>
          <a href="#">帮助中心</a>
          <span>·</span>
          <a href="#">反馈建议</a>
        </p>
        <p className="footer-copyright">© 2024 百度贴吧</p>
      </div>

      <style jsx>{`
        .sidebar {
          width: 280px;
          
          &.sidebar-left {
            margin-right: 20px;
          }
          
          &.sidebar-right {
            margin-left: 20px;
          }
        }
        
        .user-card {
          margin-bottom: 16px;
        }
        
        .user-header {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
        }
        
        .user-avatar {
          margin-right: 12px;
        }
        
        .user-details {
          flex: 1;
        }
        
        .user-name {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }
        
        .user-level {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .user-exp {
          font-size: 12px;
          color: #666;
        }
        
        .user-signature {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: #666;
          line-height: 1.4;
        }
        
        .user-stats {
          display: flex;
          justify-content: space-around;
          margin-bottom: 12px;
          padding: 8px 0;
          border-top: 1px solid #f0f0f0;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .stat-label {
          font-size: 12px;
          color: #999;
        }
        
        .stat-value {
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }
        
        .login-card {
          margin-bottom: 16px;
          text-align: center;
        }
        
        .login-prompt {
          padding: 16px 0;
        }
        
        .login-icon {
          font-size: 32px;
          color: #1890ff;
          margin-bottom: 8px;
        }
        
        .login-buttons {
          display: flex;
          gap: 8px;
          justify-content: center;
          margin-top: 12px;
        }
        
        .hot-tiebas-card,
        .ranking-card,
        .calendar-card {
          margin-bottom: 16px;
        }
        
        .tieba-item {
          padding: 8px 0 !important;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .tieba-link {
          display: flex;
          align-items: center;
          text-decoration: none;
          color: inherit;
          flex: 1;
        }
        
        .tieba-info {
          margin-left: 8px;
          display: flex;
          flex-direction: column;
        }
        
        .tieba-name {
          font-size: 14px;
          font-weight: 500;
          color: #333;
        }
        
        .tieba-stats {
          font-size: 12px;
          color: #999;
        }
        
        .card-footer {
          text-align: center;
          padding-top: 8px;
          border-top: 1px solid #f0f0f0;
        }
        
        .ranking-item {
          padding: 6px 0 !important;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .ranking-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .ranking-number {
          display: inline-block;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          text-align: center;
          line-height: 20px;
          font-size: 12px;
          font-weight: 600;
          color: white;
          
          &.ranking-1 {
            background: #ff4d4f;
          }
          
          &.ranking-2 {
            background: #ff7a45;
          }
          
          &.ranking-3 {
            background: #ffa940;
          }
          
          &.ranking-4,
          &.ranking-5 {
            background: #d9d9d9;
            color: #666;
          }
        }
        
        .ranking-name {
          font-size: 14px;
          color: #333;
        }
        
        .ranking-heat {
          font-size: 12px;
          color: #999;
        }
        
        .calendar-item {
          padding: 8px 0 !important;
        }
        
        .event-date {
          font-size: 12px;
          color: #1890ff;
          font-weight: 500;
          min-width: 40px;
        }
        
        .event-content {
          font-size: 13px;
          color: #666;
          line-height: 1.4;
        }
        
        .sidebar-footer {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #f0f0f0;
          text-align: center;
        }
        
        .footer-links {
          margin: 0 0 8px 0;
          font-size: 12px;
          color: #999;
        }
        
        .footer-links a {
          color: #666;
          text-decoration: none;
          
          &:hover {
            color: #1890ff;
          }
        }
        
        .footer-links span {
          margin: 0 8px;
        }
        
        .footer-copyright {
          margin: 0;
          font-size: 12px;
          color: #999;
        }
        
        @media (max-width: 1024px) {
          .sidebar {
            width: 240px;
          }
        }
        
        @media (max-width: 768px) {
          .sidebar {
            width: 100%;
            margin: 0;
            
            &.sidebar-left,
            &.sidebar-right {
              margin: 0 0 20px 0;
            }
          }
          
          .user-header {
            flex-direction: column;
            text-align: center;
          }
          
          .user-avatar {
            margin-right: 0;
            margin-bottom: 8px;
          }
          
          .user-stats {
            flex-direction: column;
            gap: 8px;
          }
          
          .tieba-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          
          .tieba-link {
            width: 100%;
          }
        }
      `}</style>
    </aside>
  )
}

export default Sidebar