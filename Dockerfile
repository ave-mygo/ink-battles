# --- Build 阶段 ---
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable
RUN corepack pnpm config set registry https://registry.npmmirror.com
RUN corepack pnpm install --frozen-lockfile
COPY . .
RUN corepack pnpm build

# --- 运行阶段 ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

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
CMD ["corepack", "pnpm", "start"]