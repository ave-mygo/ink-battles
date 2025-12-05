#!/bin/sh
set -e

echo "=========================================="
echo "  Ink Battles - Docker Entrypoint"
echo "=========================================="

# 检查配置文件
if [ -f "/app/config.toml" ]; then
    echo "[entrypoint] ✓ 找到配置文件: /app/config.toml"
    # 显示配置文件的挂载状态（检查是否是挂载的文件）
    echo "[entrypoint]   文件大小: $(stat -c%s /app/config.toml 2>/dev/null || stat -f%z /app/config.toml 2>/dev/null) bytes"
    # 显示配置文件的前几行（不含敏感信息的部分）用于验证
    echo "[entrypoint]   配置预览 (app section):"
    grep -A 3 "^\[app\]" /app/config.toml 2>/dev/null | head -4 | sed 's/^/              /'
elif [ -n "$CONFIG_PATH" ] && [ -f "$CONFIG_PATH" ]; then
    echo "[entrypoint] ✓ 找到配置文件: $CONFIG_PATH"
else
    echo "[entrypoint] ✗ 警告: 未找到 config.toml，将使用示例配置"
    echo "[entrypoint]   请挂载配置文件: -v /path/to/config.toml:/app/config.toml"
    # 如果存在示例配置，提示使用
    if [ -f "/app/config.example.toml" ]; then
        echo "[entrypoint]   使用示例配置作为后备"
    fi
fi

# 显示环境信息
echo "[entrypoint] NODE_ENV: ${NODE_ENV:-development}"
echo "[entrypoint] PORT: ${PORT:-3000}"

# 启动应用
echo "[entrypoint] 启动 Next.js 应用..."
exec node server.js
