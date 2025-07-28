@echo off
echo ========================================
echo 精尚慧 - 立即部署脚本
echo ========================================
echo.

echo 🚀 第一步：Vercel部署
echo 1. 打开 https://vercel.com
echo 2. 用GitHub登录
echo 3. 点击 "New Project"  
echo 4. 导入 Jerry-haoxuan/jinshang-hui
echo 5. 先让它尝试构建（会失败，但会创建项目）
echo.

echo 📁 第二步：准备文件
echo 正在打开项目文件夹...
start .

echo.
echo 📋 需要手动上传到GitHub的关键文件：
echo.
echo 必须上传的配置文件：
echo   - package.json
echo   - next.config.js
echo   - tsconfig.json
echo.
echo 必须上传的目录：
echo   - app/ (整个文件夹)
echo   - components/ (整个文件夹)  
echo   - lib/ (整个文件夹)
echo   - public/ (整个文件夹)
echo.

echo 🌐 第三步：GitHub上传
echo 1. 访问: https://github.com/Jerry-haoxuan/jinshang-hui
echo 2. 点击 "uploading an existing file" 或拖拽文件
echo 3. 上传上述文件和文件夹
echo 4. 提交更改
echo.

echo 🎯 第四步：重新部署
echo GitHub文件上传后，Vercel会自动重新构建
echo 或者在Vercel控制台点击 "Redeploy"
echo.

echo ⚡ 环境变量设置
echo 在Vercel项目设置中添加：
echo NEXT_PUBLIC_DEEPSEEK_API_KEY=your_api_key_here
echo.

echo ========================================
echo 🎉 开始部署吧！
echo ========================================

pause 