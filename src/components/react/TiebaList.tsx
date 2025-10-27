import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, Avatar, Button, Spin, Empty, Tag } from 'antd'
import { StarOutlined, UserOutlined, FireOutlined } from '@ant-design/icons'
import type { TiebaInfo } from '@/types'

interface Props {
  title?: string
  type?: 'hot' | 'recommend' | 'followed'
  maxCount?: number
  showMore?: boolean
}

const TiebaList: React.FC<Props> = ({
  title = '热门贴吧',
  type = 'hot',
  maxCount = 10,
  showMore = true
}) => {
  const [tiebas, setTiebas] = useState<TiebaInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchTiebas()
  }, [type, page])

  const fetchTiebas = async () => {
    setLoading(true)
    try {
      // 模拟API调用
      const mockTiebas: TiebaInfo[] = [
        {
          id: '1',
          name: '英雄联盟',
          avatar: '/tieba/lol.jpg',
          memberCount: 12500000,
          postCount: 56800000,
          description: '英雄联盟官方贴吧，讨论游戏攻略、赛事资讯',
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
          description: '考研学习交流，资料分享，经验交流',
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
          description: '电影资讯、影评、观影交流',
          isFollowed: false,
          todayPostCount: 5600,
          category: '娱乐',
          createTime: '2008-12-03'
        },
        {
          id: '4',
          name: '健身',
          avatar: '/tieba/fitness.jpg',
          memberCount: 4500000,
          postCount: 12300000,
          description: '健身交流，训练计划，营养指导',
          isFollowed: false,
          todayPostCount: 3400,
          category: '健康',
          createTime: '2011-03-18'
        },
        {
          id: '5',
          name: '编程',
          avatar: '/tieba/coding.jpg',
          memberCount: 3200000,
          postCount: 8900000,
          description: '编程技术交流，学习资源分享',
          isFollowed: true,
          todayPostCount: 2800,
          category: '技术',
          createTime: '2012-07-22'
        }
      ]
      
      // 根据类型过滤
      let filteredTiebas = mockTiebas
      if (type === 'followed') {
        filteredTiebas = mockTiebas.filter(tieba => tieba.isFollowed)
      }
      
      setTiebas(filteredTiebas.slice(0, maxCount))
    } catch (error) {
      console.error('获取贴吧列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFollow = async (tiebaId: string, follow: boolean) => {
    try {
      // 模拟关注/取消关注API调用
      setTiebas(prev => 
        prev.map(tieba => 
          tieba.id === tiebaId 
            ? { ...tieba, isFollowed: follow, memberCount: follow ? tieba.memberCount + 1 : tieba.memberCount - 1 }
            : tieba
        )
      )
    } catch (error) {
      console.error('操作失败:', error)
    }
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + '万'
    } else if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万'
    }
    return num.toString()
  }

  if (loading && tiebas.length === 0) {
    return (
      <Card title={title}>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
        </div>
      </Card>
    )
  }

  if (tiebas.length === 0) {
    return (
      <Card title={title}>
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无贴吧数据"
        />
      </Card>
    )
  }

  return (
    <Card 
      title={title}
      extra={showMore && (
        <Link to="/tiebas">
          <Button type="link" size="small">查看更多</Button>
        </Link>
      )}
      className="tieba-list"
    >
      <div className="tieba-grid">
        {tiebas.map(tieba => (
          <div key={tieba.id} className="tieba-item">
            <Link to={`/tieba/${tieba.id}`} className="tieba-link">
              <div className="tieba-header">
                <Avatar 
                  src={tieba.avatar} 
                  icon={<UserOutlined />}
                  size={48}
                  className="tieba-avatar"
                />
                <div className="tieba-info">
                  <h3 className="tieba-name">{tieba.name}</h3>
                  <Tag color="blue" className="category-tag">
                    {tieba.category}
                  </Tag>
                </div>
              </div>
              
              <p className="tieba-description">{tieba.description}</p>
              
              <div className="tieba-stats">
                <div className="stat-item">
                  <UserOutlined />
                  <span>{formatNumber(tieba.memberCount)} 关注</span>
                </div>
                <div className="stat-item">
                  <FireOutlined />
                  <span>{formatNumber(tieba.todayPostCount)} 今日</span>
                </div>
              </div>
            </Link>
            
            <div className="tieba-actions">
              <Button
                type={tieba.isFollowed ? "default" : "primary"}
                size="small"
                icon={<StarOutlined />}
                onClick={(e) => {
                  e.preventDefault()
                  handleFollow(tieba.id, !tieba.isFollowed)
                }}
              >
                {tieba.isFollowed ? '已关注' : '关注'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .tieba-list {
          margin-bottom: 20px;
        }
        
        .tieba-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }
        
        .tieba-item {
          border: 1px solid #f0f0f0;
          border-radius: 8px;
          padding: 16px;
          transition: all 0.3s ease;
          background: white;
          
          &:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            transform: translateY(-2px);
          }
        }
        
        .tieba-link {
          text-decoration: none;
          color: inherit;
          display: block;
          margin-bottom: 12px;
        }
        
        .tieba-header {
          display: flex;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        
        .tieba-avatar {
          margin-right: 12px;
          flex-shrink: 0;
        }
        
        .tieba-info {
          flex: 1;
          min-width: 0;
        }
        
        .tieba-name {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 600;
          color: #333;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .category-tag {
          font-size: 12px;
          margin: 0;
        }
        
        .tieba-description {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: #666;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .tieba-stats {
          display: flex;
          gap: 16px;
          margin-bottom: 12px;
        }
        
        .stat-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #999;
        }
        
        .tieba-actions {
          display: flex;
          justify-content: flex-end;
        }
        
        @media (max-width: 768px) {
          .tieba-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          
          .tieba-item {
            padding: 12px;
          }
          
          .tieba-header {
            align-items: center;
          }
          
          .tieba-avatar {
            width: 40px;
            height: 40px;
          }
          
          .tieba-name {
            font-size: 14px;
          }
          
          .tieba-description {
            font-size: 13px;
          }
        }
        
        @media (max-width: 480px) {
          .tieba-stats {
            flex-direction: column;
            gap: 8px;
          }
        }
      `}</style>
    </Card>
  )
}

export default TiebaList