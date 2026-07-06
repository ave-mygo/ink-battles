FROM node:24-bookworm-slim AS panel-builder

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/auth/package.json apps/auth/package.json
COPY apps/auth/panel/package.json apps/auth/panel/package.json
COPY apps/auth apps/auth

RUN pnpm install --filter @ink-battles/auth-panel --frozen-lockfile
RUN pnpm --filter @ink-battles/auth-panel build

FROM rust:1-bookworm AS server-builder

WORKDIR /app/apps/auth
COPY apps/auth/Cargo.toml Cargo.toml
COPY apps/auth/src src
COPY --from=panel-builder /app/apps/auth/panel/out panel/out

RUN cargo build --release

FROM debian:bookworm-slim AS runtime

WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=server-builder /app/apps/auth/target/release/ink-auth-service /usr/local/bin/ink-auth-service

EXPOSE 3100
CMD ["ink-auth-service"]
