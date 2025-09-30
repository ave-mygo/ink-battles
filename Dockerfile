# --- Build 阶段 ---
FROM node:22-alpine AS builder
WORKDIR /app

# Make pnpm store path explicit for stable cache mounts
ENV PNPM_STORE_DIR=/pnpm/store \
	PNPM_HOME=/root/.local/share/pnpm \
	PATH=/root/.local/share/pnpm:$PATH \
	CI=1

# Next.js/SWC 在 Alpine (musl) 环境需要 libc6-compat 支持
RUN apk add --no-cache libc6-compat

COPY package.json pnpm-lock.yaml ./
RUN corepack enable
RUN corepack pnpm config set registry https://registry.npmmirror.com
RUN corepack pnpm config set store-dir ${PNPM_STORE_DIR}

# Fetch and install deps based only on lockfile so this layer is cacheable
RUN --mount=type=cache,target=${PNPM_STORE_DIR},sharing=locked \
	corepack pnpm fetch
RUN --mount=type=cache,target=${PNPM_STORE_DIR},sharing=locked \
	corepack pnpm install --frozen-lockfile --prefer-offline

COPY . .

RUN corepack pnpm build

# --- 运行阶段 ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# 运行环境同样需要 libc6-compat
RUN apk add --no-cache libc6-compat

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# 只复制生产环境需要的文件
COPY --from=builder /app/package.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.ts ./

# 变更文件所有者
RUN chown -R nextjs:nodejs /app/.next

# 使用非root用户运行应用
USER nextjs

EXPOSE 3000
CMD ["corepack", "pnpm", "next", "start", "-H", "0.0.0.0"]