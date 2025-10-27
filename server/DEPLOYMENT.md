# 贴吧系统部署指南

## 系统要求

### 硬件要求
- **CPU**: 2核以上
- **内存**: 4GB以上
- **存储**: 20GB可用空间

### 软件要求
- **操作系统**: Windows 10/11, Linux, macOS
- **Node.js**: 16.0.0 或更高版本
- **npm**: 8.0.0 或更高版本
- **MongoDB**: 6.0 或更高版本
- **Redis**: 7.0 或更高版本
- **Docker**: 20.10 或更高版本 (可选)
- **Docker Compose**: 2.0 或更高版本 (可选)

## 快速开始

### 1. 环境准备

#### Windows 环境

1. **安装 Node.js**
   - 访问 [Node.js官网](https://nodejs.org/) 下载并安装 LTS 版本
   - 验证安装：
     ```cmd
     node --version
     npm --version
     ```

2. **安装 MongoDB**
   - 下载 [MongoDB Community Server](https://www.mongodb.com/try/download/community)
   - 安装并启动 MongoDB 服务

3. **安装 Redis**
   - 下载 [Redis for Windows](https://github.com/microsoftarchive/redis/releases)
   - 解压并运行 redis-server.exe

#### Linux 环境 (Ubuntu/Debian)

```bash
# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod

# 安装 Redis
sudo apt-get install redis-server
sudo systemctl start redis-server
```

#### macOS 环境

```bash
# 使用 Homebrew 安装
brew install node
brew install mongodb-community
brew services start mongodb-community
brew install redis
brew services start redis
```

### 2. 项目配置

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd 2023-tieba-bk/server
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **环境配置**
   ```bash
   # 复制环境变量文件
   cp .env.example .env
   
   # 编辑配置文件
   nano .env  # 或使用其他编辑器
   ```

4. **配置环境变量**
   ```env
   # 应用配置
   NODE_ENV=development
   PORT=3000
   
   # 数据库配置
   MONGODB_URI=mongodb://localhost:27017/tieba
   REDIS_URL=redis://localhost:6379
   
   # JWT 配置
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=7d
   
   # 其他配置根据实际需求修改
   ```

### 3. 数据库初始化

1. **启动 MongoDB 和 Redis**
   ```bash
   # Windows
   mongod --dbpath "C:\data\db"
   redis-server
   
   # Linux/macOS
   sudo systemctl start mongod
   sudo systemctl start redis-server
   ```

2. **初始化数据库** (可选)
   ```bash
   # 运行初始化脚本
   node scripts/init-database.js
   ```

### 4. 启动应用

#### 开发模式
```bash
npm run dev
```

#### 生产模式
```bash
npm start
```

### 5. 验证安装

访问 http://localhost:3000/api 查看 API 文档

## Docker 部署

### 1. 安装 Docker

- [Docker Desktop for Windows/Mac](https://www.docker.com/products/docker-desktop)
- [Docker Engine for Linux](https://docs.docker.com/engine/install/)

### 2. 使用 Docker Compose

```bash
# 复制环境变量文件
cp .env.example .env

# 编辑环境变量
nano .env

# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f app
```

### 3. 单独构建镜像

```bash
# 构建应用镜像
docker build -t tieba-app .

# 运行容器
docker run -p 3000:3000 --env-file .env tieba-app
```

## 测试

### 运行测试套件

```bash
# 单元测试
npm test

# 集成测试
npm run test:integration

# 端到端测试
npm run test:e2e

# 所有测试
npm run test:all
```

### 测试覆盖率

```bash
# 生成测试覆盖率报告
npm test -- --coverage

# 查看覆盖率报告
open coverage/lcov-report/index.html
```

## 部署脚本

### 使用部署脚本

```bash
# 显示帮助信息
./scripts/deploy.sh --help

# 开发环境部署
./scripts/deploy.sh --dev

# 生产环境部署
./scripts/deploy.sh --prod

# 运行测试
./scripts/deploy.sh --test

# 构建应用
./scripts/deploy.sh --build

# 清理环境
./scripts/deploy.sh --clean

# 启动监控
./scripts/deploy.sh --monitor
```

## 监控和日志

### 应用监控

1. **启用 Prometheus 和 Grafana**
   ```bash
   docker-compose up -d monitor grafana
   ```
   
   - Prometheus: http://localhost:9090
   - Grafana: http://localhost:3001 (admin/admin123)

2. **查看应用日志**
   ```bash
   # Docker 环境
   docker-compose logs -f app
   
   # 本地环境
   tail -f logs/app.log
   ```

### 健康检查

访问 http://localhost:3000/api/health 检查服务状态

## 性能优化

### 数据库优化

1. **MongoDB 索引优化**
   ```javascript
   // 创建常用查询的索引
db.users.createIndex({ "username": 1 })
db.tiebas.createIndex({ "name": 1 })
db.posts.createIndex({ "tieba": 1, "createdAt": -1 })
   ```

2. **Redis 缓存策略**
   - 用户会话缓存
   - 热门数据缓存
   - 查询结果缓存

### 应用优化

1. **启用压缩**
   ```javascript
   // 在 app.js 中启用压缩
   app.use(compression())
   ```

2. **静态文件缓存**
   ```javascript
   // 设置静态文件缓存
   app.use(express.static('public', {
     maxAge: '1y'
   }))
   ```

## 安全配置

### 环境安全

1. **保护敏感信息**
   - 不要将 .env 文件提交到版本控制
   - 使用环境变量存储敏感信息
   - 定期更换 JWT 密钥

2. **防火墙配置**
   ```bash
   # 只开放必要端口
   ufw allow 22    # SSH
   ufw allow 80    # HTTP
   ufw allow 443   # HTTPS
   ufw allow 3000  # 应用端口
   ufw enable
   ```

### 应用安全

1. **启用安全头**
   ```javascript
   app.use(helmet())
   ```

2. **配置 CORS**
   ```javascript
   app.use(cors({
     origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
     credentials: true
   }))
   ```

## 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   # 查找占用端口的进程
   lsof -i :3000
   
   # 终止进程
   kill -9 <PID>
   ```

2. **数据库连接失败**
   - 检查 MongoDB 服务是否运行
   - 验证连接字符串格式
   - 检查防火墙设置

3. **内存不足**
   ```bash
   # 查看内存使用情况
   free -h
   
   # 清理缓存
   sync && echo 3 > /proc/sys/vm/drop_caches
   ```

### 日志分析

1. **应用日志**
   ```bash
   # 查看错误日志
   tail -f logs/error.log
   
   # 搜索特定错误
   grep "ERROR" logs/app.log
   ```

2. **数据库日志**
   ```bash
   # MongoDB 日志
   tail -f /var/log/mongodb/mongod.log
   ```

## 备份和恢复

### 数据备份

```bash
# 使用部署脚本备份
./scripts/deploy.sh --backup

# 手动备份 MongoDB
mongodump --uri="mongodb://localhost:27017/tieba" --out=backups/$(date +%Y%m%d)

# 手动备份 Redis
redis-cli --rdb backups/redis_dump.rdb
```

### 数据恢复

```bash
# 恢复 MongoDB
mongorestore --uri="mongodb://localhost:27017/tieba" backups/20230801/tieba

# 恢复 Redis
redis-cli --pipe < backups/redis_dump.rdb
```

## 更新和维护

### 应用更新

```bash
# 拉取最新代码
git pull origin main

# 安装新依赖
npm install

# 重启应用
npm run restart
```

### 定期维护

1. **清理日志文件**
2. **优化数据库**
3. **更新依赖包**
4. **备份重要数据**

## 支持

如有问题，请参考：

1. **项目文档**: `docs/` 目录
2. **API 文档**: http://localhost:3000/api
3. **错误日志**: `logs/` 目录
4. **GitHub Issues**: 项目问题跟踪

---

*最后更新: 2023年8月*