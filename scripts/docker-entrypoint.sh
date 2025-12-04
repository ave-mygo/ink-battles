#!/bin/sh
set -e

echo "=========================================="
echo "  Ink Battles - Docker Entrypoint"
echo "=========================================="

# 检查配置文件
if [ -f "/app/config.toml" ]; then
    echo "[entrypoint] ✓ 找到配置文件: /app/config.toml"
elif [ -n "$CONFIG_PATH" ] && [ -f "$CONFIG_PATH" ]; then
    echo "[entrypoint] ✓ 找到配置文件: $CONFIG_PATH"
else
    echo "[entrypoint] ✗ 警告: 未找到 config.toml，将使用示例配置"
    echo "[entrypoint]   请挂载配置文件: -v /path/to/config.toml:/app/config.toml"
fi

# 显示环境信息
echo "[entrypoint] NODE_ENV: ${NODE_ENV:-development}"
echo "[entrypoint] PORT: ${PORT:-3000}"

# 启动应用
echo "[entrypoint] 启动 Next.js 应用..."
exec node server.js
