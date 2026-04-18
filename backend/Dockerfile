FROM oven/bun:1.3-alpine AS deps

WORKDIR /app
COPY backend/package.json backend/tsconfig.json ./
RUN bun install --frozen-lockfile || bun install

FROM oven/bun:1.3-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=deps /app/node_modules ./node_modules
COPY backend/src ./src
COPY backend/package.json backend/tsconfig.json ./
COPY config.example.toml ./config.example.toml

EXPOSE 3000
CMD ["bun", "src/index.ts"]
