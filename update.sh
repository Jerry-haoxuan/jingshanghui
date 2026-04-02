#!/bin/bash
# ============================================
# 一键更新脚本（以后每次改完代码后在服务器运行）
# 使用方法：bash update.sh
# ============================================

set -e

echo "=========================================="
echo "  精尚慧 更新部署"
echo "=========================================="

cd /var/www/jingshanghui

echo "[1/3] 拉取最新代码..."
git pull

echo "[2/3] 重新构建..."
npm install
npm run build

echo "[3/3] 重启应用..."
pm2 restart jsh

echo ""
echo "✅ 更新完成！"
pm2 status
