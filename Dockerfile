FROM node:22-alpine AS builder
WORKDIR /app

# 配置 pnpm + 缓存目录
ENV PNPM_STORE_DIR=/pnpm/store \
    PNPM_HOME=/root/.local/share/pnpm \
    PATH=/root/.local/share/pnpm:$PATH \
    CI=1

# Alpine 下 Next.js 构建需要的依赖
RUN apk add --no-cache libc6-compat python3 make g++

# 只拷贝依赖文件，利用缓存
COPY package.json pnpm-lock.yaml ./

# 启用 corepack，并配置 pnpm
RUN corepack enable \
 && corepack pnpm config set store-dir ${PNPM_STORE_DIR}

# 先拉取依赖（仅依赖层缓存，不受源码改动影响）
RUN --mount=type=cache,target=${PNPM_STORE_DIR},sharing=locked \
    corepack pnpm fetch

# 安装依赖（含 devDependencies，用于构建）
RUN --mount=type=cache,target=${PNPM_STORE_DIR},sharing=locked \
    corepack pnpm install --frozen-lockfile --prefer-offline

# 拷贝源码
COPY . .

# 构建 Next.js (standalone 模式会自动生成 .next/standalone)
RUN corepack pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache libc6-compat

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs \
 && adduser -S nextjs -u 1001

# 从 standalone 输出复制所有必需文件
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
