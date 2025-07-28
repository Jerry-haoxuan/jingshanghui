@echo off
echo ========================================
echo 精尚慧 - 部署准备脚本
echo ========================================
echo.

echo 正在检查项目配置...
if not exist "package.json" (
    echo 错误：未找到 package.json 文件
    pause
    exit /b 1
)

echo 正在安装依赖...
npm install

echo.
echo 正在构建项目...
npm run build

echo.
echo ========================================
echo 部署准备完成！
echo ========================================
echo.
echo 推荐部署平台：
echo 1. Vercel （最简单）- vercel.com
echo 2. 腾讯云 Webify （国内最快）- webify.cloudbase.net  
echo 3. Railway （备选方案）- railway.app
echo.
echo 重要提醒：
echo 记得在部署平台设置环境变量：
echo NEXT_PUBLIC_DEEPSEEK_API_KEY=your_api_key_here
echo.

pause 