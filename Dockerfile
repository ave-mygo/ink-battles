# syntax=docker/dockerfile:1

# ============================================
# Stage 1: 依赖安装
# ============================================
FROM node:lts-alpine AS deps

# 安装必要的系统依赖
RUN apk add --no-cache libc6-compat

WORKDIR /app

# 启用 corepack 以使用 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 复制 workspace 依赖声明，前端 Eden 类型会解析后端类型定义。
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/

# 安装依赖（包含 backend workspace）
RUN pnpm install --frozen-lockfile

# ============================================
# Stage 2: 构建
# ============================================
FROM node:lts-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# 从 deps 阶段复制 node_modules（包含 backend workspace）
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY . .

# 前端构建不读取敏感配置，运行时通过后端 API 获取公开配置。
RUN pnpm build

# ============================================
# Stage 3: 生产运行
# ============================================
FROM node:lts-alpine AS runner

WORKDIR /app

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 设置环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 复制构建产物
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 复制入口脚本
COPY --from=builder /app/scripts/docker-entrypoint.sh /app/docker-entrypoint.sh

# 设置权限
RUN chmod +x /app/docker-entrypoint.sh && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
