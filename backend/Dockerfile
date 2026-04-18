FROM node:lts-alpine AS deps

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/package.json
COPY shared/package.json ./shared/package.json

RUN pnpm install --frozen-lockfile

FROM oven/bun:1.3-alpine AS runner

WORKDIR /app/backend

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/backend/node_modules ./node_modules
COPY backend/src ./src
COPY backend/package.json backend/tsconfig.json ./
COPY shared /app/shared
COPY config.example.toml /app/config.example.toml

EXPOSE 3000

CMD ["bun", "src/index.ts"]
