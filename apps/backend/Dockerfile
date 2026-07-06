FROM node:lts-alpine AS deps

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/shared/package.json ./apps/shared/package.json

RUN pnpm install --frozen-lockfile

FROM oven/bun:1.3-alpine AS runner

WORKDIR /app/apps/backend

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/apps/backend/node_modules ./node_modules
COPY apps/backend/src ./src
COPY apps/backend/package.json apps/backend/tsconfig.json ./
COPY apps/shared /app/apps/shared
COPY config.example.toml /app/config.example.toml

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
	CMD bun -e "fetch('http://127.0.0.1:3000/api/v2/health').then(response => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["bun", "src/index.ts"]
