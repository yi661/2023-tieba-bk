#!/bin/bash

# 贴吧系统部署脚本
# 作者: 陈磊
# 版本: 1.0.0

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "命令 $1 未安装，请先安装"
        exit 1
    fi
}

# 显示帮助信息
show_help() {
    echo "贴吧系统部署脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help          显示帮助信息"
    echo "  -d, --dev           开发环境部署"
    echo "  -p, --prod          生产环境部署"
    echo "  -t, --test          运行测试"
    echo "  -b, --build         构建应用"
    echo "  -c, --clean         清理环境"
    echo "  -m, --monitor       启动监控"
    echo ""
}

# 环境检查
check_environment() {
    log_info "检查环境依赖..."
    
    # 检查 Node.js
    check_command node
    check_command npm
    
    # 检查 Docker
    check_command docker
    check_command docker-compose
    
    # 检查 Git
    check_command git
    
    log_success "环境检查完成"
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    
    if [ ! -f "package.json" ]; then
        log_error "package.json 文件不存在"
        exit 1
    fi
    
    npm ci
    
    log_success "依赖安装完成"
}

# 运行测试
run_tests() {
    log_info "运行测试..."
    
    # 检查测试配置文件
    if [ ! -f "jest.config.js" ]; then
        log_warning "测试配置文件不存在，跳过测试"
        return 0
    fi
    
    # 运行单元测试
    npm test -- --coverage --verbose
    
    # 运行集成测试
    if [ -d "src/tests" ]; then
        npm run test:integration
    fi
    
    log_success "测试完成"
}

# 代码质量检查
check_code_quality() {
    log_info "检查代码质量..."
    
    # 检查 ESLint
    if npx eslint --version &> /dev/null; then
        npx eslint src/
        log_success "ESLint 检查通过"
    else
        log_warning "ESLint 未配置，跳过代码检查"
    fi
    
    # 检查 TypeScript
    if npx tsc --version &> /dev/null; then
        npx tsc --noEmit
        log_success "TypeScript 类型检查通过"
    fi
}

# 构建应用
build_app() {
    log_info "构建应用..."
    
    # 清理构建目录
    if [ -d "dist" ]; then
        rm -rf dist
    fi
    
    # 构建应用
    npm run build
    
    # 检查构建结果
    if [ ! -d "dist" ]; then
        log_error "构建失败，dist 目录不存在"
        exit 1
    fi
    
    log_success "应用构建完成"
}

# 构建 Docker 镜像
build_docker() {
    log_info "构建 Docker 镜像..."
    
    # 检查 Dockerfile
    if [ ! -f "Dockerfile" ]; then
        log_error "Dockerfile 不存在"
        exit 1
    fi
    
    # 构建镜像
    docker build -t tieba-app:latest .
    
    log_success "Docker 镜像构建完成"
}

# 启动开发环境
start_dev() {
    log_info "启动开发环境..."
    
    # 检查环境变量文件
    if [ ! -f ".env" ]; then
        log_warning ".env 文件不存在，使用示例配置"
        cp .env.example .env
    fi
    
    # 启动开发服务器
    npm run dev
}

# 启动生产环境
start_prod() {
    log_info "启动生产环境..."
    
    # 检查环境变量
    if [ ! -f ".env" ]; then
        log_error "生产环境需要 .env 文件"
        exit 1
    fi
    
    # 使用 Docker Compose 启动
    docker-compose up -d
    
    # 等待服务启动
    sleep 30
    
    # 检查服务状态
    check_services
    
    log_success "生产环境启动完成"
}

# 检查服务状态
check_services() {
    log_info "检查服务状态..."
    
    # 检查应用服务
    if curl -f http://localhost:3000/api/health &> /dev/null; then
        log_success "应用服务运行正常"
    else
        log_error "应用服务异常"
        exit 1
    fi
    
    # 检查数据库
    if docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')" &> /dev/null; then
        log_success "数据库服务运行正常"
    else
        log_error "数据库服务异常"
        exit 1
    fi
    
    # 检查 Redis
    if docker-compose exec redis redis-cli ping &> /dev/null; then
        log_success "Redis 服务运行正常"
    else
        log_error "Redis 服务异常"
        exit 1
    fi
}

# 启动监控
start_monitor() {
    log_info "启动监控服务..."
    
    # 检查监控配置
    if [ ! -f "monitoring/prometheus.yml" ]; then
        log_warning "监控配置不存在，跳过监控启动"
        return 0
    fi
    
    # 启动监控服务
    docker-compose up -d monitor grafana
    
    log_success "监控服务启动完成"
    echo "Prometheus: http://localhost:9090"
    echo "Grafana: http://localhost:3001"
}

# 清理环境
clean_environment() {
    log_info "清理环境..."
    
    # 停止容器
    docker-compose down
    
    # 清理镜像
    docker image prune -f
    
    # 清理构建文件
    if [ -d "dist" ]; then
        rm -rf dist
    fi
    
    # 清理 node_modules
    if [ -d "node_modules" ]; then
        rm -rf node_modules
    fi
    
    # 清理日志
    if [ -d "logs" ]; then
        rm -rf logs
    fi
    
    log_success "环境清理完成"
}

# 备份数据
backup_data() {
    log_info "备份数据..."
    
    BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # 备份 MongoDB
    docker-compose exec mongodb mongodump --archive --gzip > "$BACKUP_DIR/mongodb_backup.gz"
    
    # 备份 Redis
    docker-compose exec redis redis-cli --rdb /data/dump.rdb
    docker cp "$(docker-compose ps -q redis):/data/dump.rdb" "$BACKUP_DIR/redis_dump.rdb"
    
    # 备份上传文件
    if [ -d "uploads" ]; then
        tar -czf "$BACKUP_DIR/uploads_backup.tar.gz" uploads/
    fi
    
    log_success "数据备份完成: $BACKUP_DIR"
}

# 显示系统信息
show_system_info() {
    log_info "系统信息:"
    echo "- Node.js 版本: $(node --version)"
    echo "- NPM 版本: $(npm --version)"
    echo "- Docker 版本: $(docker --version)"
    echo "- Docker Compose 版本: $(docker-compose --version)"
    echo "- 系统时间: $(date)"
    echo "- 工作目录: $(pwd)"
}

# 主函数
main() {
    local mode=""
    
    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -d|--dev)
                mode="dev"
                shift
                ;;
            -p|--prod)
                mode="prod"
                shift
                ;;
            -t|--test)
                mode="test"
                shift
                ;;
            -b|--build)
                mode="build"
                shift
                ;;
            -c|--clean)
                mode="clean"
                shift
                ;;
            -m|--monitor)
                mode="monitor"
                shift
                ;;
            *)
                log_error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 显示欢迎信息
    echo ""
    echo "========================================"
    echo "      贴吧系统部署脚本 v1.0.0"
    echo "========================================"
    echo ""
    
    show_system_info
    echo ""
    
    # 根据模式执行相应操作
    case $mode in
        "dev")
            check_environment
            install_dependencies
            start_dev
            ;;
        "prod")
            check_environment
            install_dependencies
            run_tests
            check_code_quality
            build_app
            build_docker
            start_prod
            ;;
        "test")
            check_environment
            install_dependencies
            run_tests
            ;;
        "build")
            check_environment
            install_dependencies
            build_app
            build_docker
            ;;
        "clean")
            clean_environment
            ;;
        "monitor")
            start_monitor
            ;;
        *)
            log_error "请指定部署模式"
            show_help
            exit 1
            ;;
    esac
    
    echo ""
    log_success "部署脚本执行完成"
    echo ""
}

# 执行主函数
main "$@"