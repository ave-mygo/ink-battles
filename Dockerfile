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

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# ============================================
# Stage 2: 构建
# ============================================
FROM node:lts-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# 从 deps 阶段复制 node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 构建应用（需要 config.ts 存在）
# 如果构建时没有 config.ts，可以先复制 example
RUN if [ ! -f src/config.ts ]; then cp src/config.example.ts src/config.ts; fi

# 确保有配置文件用于构建（运行时会被挂载覆盖）
RUN if [ ! -f config.toml ]; then cp config.example.toml config.toml; fi

# 构建 Next.js 应用
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

# 复制示例配置（运行时会被 volume 覆盖）
COPY --from=builder /app/config.example.toml /app/config.example.toml

# 设置权限
RUN chmod +x /app/docker-entrypoint.sh && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
