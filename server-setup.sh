#!/bin/bash
# ============================================
# 阿里云 Ubuntu 22.04 一键部署脚本
# 精尚慧 (jingshanghui) - Next.js 应用
# 使用方法：在服务器上运行 bash server-setup.sh
# ============================================

set -e  # 遇到错误立即停止

echo "=========================================="
echo "  精尚慧 服务器初始化脚本"
echo "=========================================="

# ---------- 1. 系统更新 ----------
echo ""
echo "[1/7] 更新系统包..."
apt update -y && apt upgrade -y
apt install -y git curl wget nginx certbot python3-certbot-nginx ufw

# ---------- 2. 安装 Node.js 20 ----------
echo ""
echo "[2/7] 安装 Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
echo "Node.js 版本: $(node -v)"
echo "npm 版本: $(npm -v)"

# ---------- 3. 安装 PM2 ----------
echo ""
echo "[3/7] 安装 PM2..."
npm install -g pm2
echo "PM2 版本: $(pm2 -v)"

# ---------- 4. 克隆项目 ----------
echo ""
echo "[4/7] 克隆项目代码..."
mkdir -p /var/www
cd /var/www

if [ -d "jingshanghui" ]; then
  echo "项目已存在，拉取最新代码..."
  cd jingshanghui
  git pull
else
  git clone https://github.com/Jerry-haoxuan/jingshanghui.git
  cd jingshanghui
fi

# ---------- 5. 写入环境变量 ----------
echo ""
echo "[5/7] 写入环境变量..."
cat > .env.local << 'ENVEOF'
# 阿里云 RDS PostgreSQL（内网地址）
DATABASE_URL=postgresql://JSH:Qinhaoxuan520@pgm-uf63572vz9s9fve1.pg.rds.aliyuncs.com:5432/ecosystem
BOCHA_API_KEY=sk-acad3b7087ea4b689a7b1c1ee0d0261c
TIANYANCHA_TOKEN=494fc369-4149-4035-a994-ede38238ab0d
TIANYANCHA_PROXY_BASE=
ENVEOF
echo "环境变量已写入 .env.local"

# ---------- 6. 安装依赖并构建 ----------
echo ""
echo "[6/7] 安装依赖并构建项目（需要几分钟）..."
npm install
npm run build

# ---------- 7. 启动 PM2 ----------
echo ""
echo "[7/7] 启动应用..."
pm2 delete jsh 2>/dev/null || true
pm2 start npm --name "jsh" -- start
pm2 startup ubuntu -u root --hp /root
pm2 save

echo ""
echo "=========================================="
echo "  应用已启动！监听端口 3000"
echo "  运行 pm2 status 查看状态"
echo "  运行 pm2 logs jsh 查看日志"
echo "=========================================="
