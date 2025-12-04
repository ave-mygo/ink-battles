#!/bin/bash

# =================================================================
# Ink Battles Docker 一键部署脚本
# =================================================================
#
# 使用方法:
#   curl -fsSL https://raw.githubusercontent.com/ave-mygo/ink-battles/main/scripts/deploy.sh | bash
#
# 或者下载后执行:
#   chmod +x deploy.sh && ./deploy.sh
#

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# GitHub 仓库信息
REPO_OWNER="ave-mygo"
REPO_NAME="ink-battles"
BRANCH="main"
RAW_BASE_URL="https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}"

# 默认安装目录
INSTALL_DIR="${INSTALL_DIR:-$HOME/ink-battles}"

# =================================================================
# 工具函数
# =================================================================

print_banner() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║                                                          ║"
    echo "║   ██╗███╗   ██╗██╗  ██╗    ██████╗  █████╗ ████████╗     ║"
    echo "║   ██║████╗  ██║██║ ██╔╝    ██╔══██╗██╔══██╗╚══██╔══╝     ║"
    echo "║   ██║██╔██╗ ██║█████╔╝     ██████╔╝███████║   ██║        ║"
    echo "║   ██║██║╚██╗██║██╔═██╗     ██╔══██╗██╔══██║   ██║        ║"
    echo "║   ██║██║ ╚████║██║  ██╗    ██████╔╝██║  ██║   ██║        ║"
    echo "║   ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝    ╚═════╝ ╚═╝  ╚═╝   ╚═╝        ║"
    echo "║                                                          ║"
    echo "║              Ink Battles 一键部署脚本                     ║"
    echo "║                                                          ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
check_command() {
    if ! command -v "$1" &> /dev/null; then
        return 1
    fi
    return 0
}

# 生成随机字符串
generate_random_string() {
    local length=${1:-32}
    if check_command openssl; then
        openssl rand -hex "$((length / 2))"
    else
        cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w "$length" | head -n 1
    fi
}

# =================================================================
# 环境检查
# =================================================================

check_requirements() {
    log_info "检查系统环境..."
    
    # 检查 Docker
    if ! check_command docker; then
        log_error "未检测到 Docker，请先安装 Docker"
        echo ""
        echo "安装 Docker 的方法:"
        echo "  官方安装脚本: curl -fsSL https://get.docker.com | sh"
        echo "  或访问: https://docs.docker.com/engine/install/"
        exit 1
    fi
    log_success "Docker 已安装: $(docker --version)"
    
    # 检查 Docker Compose
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker compose"
        log_success "Docker Compose (V2) 已安装"
    elif check_command docker-compose; then
        DOCKER_COMPOSE_CMD="docker-compose"
        log_success "Docker Compose (V1) 已安装"
    else
        log_error "未检测到 Docker Compose，请先安装"
        exit 1
    fi
    
    # 检查 Docker 服务是否运行
    if ! docker info &> /dev/null; then
        log_error "Docker 服务未运行，请先启动 Docker"
        exit 1
    fi
    log_success "Docker 服务正常运行"
    
    # 检查 curl
    if ! check_command curl; then
        log_error "未检测到 curl，请先安装 curl"
        exit 1
    fi
    log_success "curl 已安装"
    
    echo ""
}

# =================================================================
# 下载文件
# =================================================================

download_file() {
    local url="$1"
    local dest="$2"
    local desc="$3"
    
    log_info "下载 ${desc}..."
    if curl -fsSL "$url" -o "$dest"; then
        log_success "${desc} 下载完成"
    else
        log_error "${desc} 下载失败: $url"
        exit 1
    fi
}

# =================================================================
# 主安装流程
# =================================================================

install() {
    print_banner
    
    # 检查环境
    check_requirements
    
    # 询问安装目录
    echo -e "${CYAN}请输入安装目录 (默认: ${INSTALL_DIR}):${NC}"
    read -r input_dir
    if [ -n "$input_dir" ]; then
        INSTALL_DIR="$input_dir"
    fi
    
    # 检查目录是否已存在
    if [ -d "$INSTALL_DIR" ]; then
        log_warn "目录 $INSTALL_DIR 已存在"
        echo -e "${YELLOW}是否覆盖? (y/N):${NC}"
        read -r overwrite
        if [[ ! "$overwrite" =~ ^[Yy]$ ]]; then
            log_info "安装取消"
            exit 0
        fi
    fi
    
    # 创建安装目录
    log_info "创建安装目录: $INSTALL_DIR"
    mkdir -p "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    
    # 下载必要文件
    echo ""
    log_info "开始下载配置文件..."
    download_file "${RAW_BASE_URL}/docker-compose.yml" "docker-compose.yml" "docker-compose.yml"
    download_file "${RAW_BASE_URL}/Dockerfile" "Dockerfile" "Dockerfile"
    download_file "${RAW_BASE_URL}/config.example.toml" "config.example.toml" "config.example.toml"
    
    # 下载源代码相关文件
    log_info "下载源代码文件..."
    download_file "${RAW_BASE_URL}/package.json" "package.json" "package.json"
    download_file "${RAW_BASE_URL}/pnpm-lock.yaml" "pnpm-lock.yaml" "pnpm-lock.yaml"
    download_file "${RAW_BASE_URL}/next.config.ts" "next.config.ts" "next.config.ts"
    download_file "${RAW_BASE_URL}/tsconfig.json" "tsconfig.json" "tsconfig.json"
    download_file "${RAW_BASE_URL}/postcss.config.mjs" "postcss.config.mjs" "postcss.config.mjs"
    download_file "${RAW_BASE_URL}/unocss.config.ts" "unocss.config.ts" "unocss.config.ts"
    download_file "${RAW_BASE_URL}/components.json" "components.json" "components.json"
    download_file "${RAW_BASE_URL}/global.d.ts" "global.d.ts" "global.d.ts"
    
    # 下载 src 目录（通过 GitHub API 获取文件列表会比较复杂，这里使用打包下载）
    log_info "下载源代码..."
    
    # 使用 GitHub 的 tarball 下载并解压
    curl -fsSL "https://github.com/${REPO_OWNER}/${REPO_NAME}/archive/refs/heads/${BRANCH}.tar.gz" -o source.tar.gz
    tar -xzf source.tar.gz --strip-components=1 "${REPO_NAME}-${BRANCH}/src" "${REPO_NAME}-${BRANCH}/public" "${REPO_NAME}-${BRANCH}/scripts" 2>/dev/null || true
    rm -f source.tar.gz
    log_success "源代码下载完成"
    
    # 创建配置文件
    echo ""
    log_info "配置应用..."
    
    if [ ! -f "config.toml" ]; then
        cp config.example.toml config.toml
        
        # 生成随机密钥
        JWT_SECRET=$(generate_random_string 64)
        API_KEY=$(generate_random_string 32)
        
        # 替换配置文件中的默认值
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/YOUR_JWT_SECRET_KEY/${JWT_SECRET}/g" config.toml
            sed -i '' "s/YOUR_APP_API_KEY_SECRET/${API_KEY}/g" config.toml
            sed -i '' 's/host = "localhost"/host = "mongodb"/g' config.toml
        else
            # Linux
            sed -i "s/YOUR_JWT_SECRET_KEY/${JWT_SECRET}/g" config.toml
            sed -i "s/YOUR_APP_API_KEY_SECRET/${API_KEY}/g" config.toml
            sed -i 's/host = "localhost"/host = "mongodb"/g' config.toml
        fi
        
        log_success "配置文件已生成: config.toml"
        log_warn "请编辑 config.toml 填写您的实际配置（API密钥、邮件服务等）"
    else
        log_info "配置文件已存在，跳过生成"
    fi
    
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                    安装完成!                              ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}安装目录:${NC} $INSTALL_DIR"
    echo ""
    echo -e "${YELLOW}接下来请完成以下步骤:${NC}"
    echo ""
    echo "  1. 编辑配置文件:"
    echo -e "     ${CYAN}cd $INSTALL_DIR${NC}"
    echo -e "     ${CYAN}nano config.toml${NC}  或  ${CYAN}vim config.toml${NC}"
    echo ""
    echo "  2. 填写必要的配置项:"
    echo "     - system_models: AI 模型 API 配置"
    echo "     - grading_models: 评分模型配置"
    echo "     - email: 邮件服务配置（用于发送验证码）"
    echo "     - afdian: 爱发电配置（可选，用于赞助功能）"
    echo "     - app: 应用基本信息"
    echo ""
    echo "  3. 启动服务:"
    echo -e "     ${CYAN}${DOCKER_COMPOSE_CMD} up -d${NC}"
    echo ""
    echo "  4. 查看日志:"
    echo -e "     ${CYAN}${DOCKER_COMPOSE_CMD} logs -f${NC}"
    echo ""
    echo "  5. 访问应用:"
    echo -e "     ${CYAN}http://localhost:3001${NC}"
    echo ""
    echo -e "${YELLOW}其他常用命令:${NC}"
    echo "  停止服务:  ${CYAN}${DOCKER_COMPOSE_CMD} down${NC}"
    echo "  重启服务:  ${CYAN}${DOCKER_COMPOSE_CMD} restart${NC}"
    echo "  更新应用:  ${CYAN}${DOCKER_COMPOSE_CMD} pull && ${DOCKER_COMPOSE_CMD} up -d --build${NC}"
    echo ""
}

# =================================================================
# 更新功能
# =================================================================

update() {
    print_banner
    log_info "更新 Ink Battles..."
    
    if [ ! -f "docker-compose.yml" ]; then
        log_error "未找到 docker-compose.yml，请确认在正确的目录下执行"
        exit 1
    fi
    
    # 备份配置
    if [ -f "config.toml" ]; then
        cp config.toml config.toml.backup
        log_info "已备份配置文件: config.toml.backup"
    fi
    
    # 停止服务
    log_info "停止当前服务..."
    $DOCKER_COMPOSE_CMD down
    
    # 下载最新文件
    log_info "下载最新版本..."
    curl -fsSL "https://github.com/${REPO_OWNER}/${REPO_NAME}/archive/refs/heads/${BRANCH}.tar.gz" -o source.tar.gz
    tar -xzf source.tar.gz --strip-components=1
    rm -f source.tar.gz
    
    # 恢复配置
    if [ -f "config.toml.backup" ]; then
        mv config.toml.backup config.toml
        log_info "已恢复配置文件"
    fi
    
    # 重新构建并启动
    log_info "重新构建并启动服务..."
    $DOCKER_COMPOSE_CMD up -d --build
    
    log_success "更新完成!"
}

# =================================================================
# 卸载功能
# =================================================================

uninstall() {
    print_banner
    log_warn "即将卸载 Ink Battles"
    echo ""
    echo -e "${RED}警告: 此操作将删除所有数据，包括数据库!${NC}"
    echo -e "${YELLOW}是否继续? (输入 'YES' 确认):${NC}"
    read -r confirm
    
    if [ "$confirm" != "YES" ]; then
        log_info "卸载取消"
        exit 0
    fi
    
    if [ -f "docker-compose.yml" ]; then
        log_info "停止并删除容器..."
        $DOCKER_COMPOSE_CMD down -v
    fi
    
    log_info "删除安装目录..."
    cd ..
    rm -rf "$INSTALL_DIR"
    
    log_success "卸载完成"
}

# =================================================================
# 入口
# =================================================================

case "${1:-install}" in
    install)
        install
        ;;
    update)
        update
        ;;
    uninstall)
        uninstall
        ;;
    *)
        echo "用法: $0 {install|update|uninstall}"
        echo ""
        echo "命令:"
        echo "  install    安装 Ink Battles (默认)"
        echo "  update     更新到最新版本"
        echo "  uninstall  卸载 Ink Battles"
        exit 1
        ;;
esac
