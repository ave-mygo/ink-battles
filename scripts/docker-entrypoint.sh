#!/bin/sh
set -e

echo "=========================================="
echo "  Ink Battles - Docker Entrypoint"
echo "=========================================="

echo "[entrypoint] NODE_ENV: ${NODE_ENV:-development}"
echo "[entrypoint] PORT: ${PORT:-3000}"
echo "[entrypoint] INTERNAL_API_BASE_URL: ${INTERNAL_API_BASE_URL:-not set}"

# 启动应用
echo "[entrypoint] 启动 Next.js 应用..."
exec node server.js
