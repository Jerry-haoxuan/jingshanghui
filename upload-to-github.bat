@echo off
echo ========================================
echo 精尚慧 - GitHub 上传脚本
echo ========================================
echo.

echo 请确保您已在 GitHub 创建了名为 "jinshang-hui" 的仓库
echo.

set /p username="请输入您的 GitHub 用户名: "
if "%username%"=="" (
    echo 错误：用户名不能为空
    pause
    exit /b 1
)

echo.
echo 正在连接到 GitHub 仓库...
git remote add origin https://github.com/%username%/jinshang-hui.git

echo 正在切换到 main 分支...
git branch -M main

echo.
echo 正在推送代码到 GitHub...
echo 如果提示输入用户名和密码，请使用您的 GitHub 凭据
echo （建议使用 Personal Access Token 作为密码）
echo.

git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo ✅ 上传成功！
    echo ========================================
    echo.
    echo 仓库地址: https://github.com/%username%/jinshang-hui
    echo.
    echo 接下来您可以：
    echo 1. 访问仓库设置描述和标签
    echo 2. 查看 DEPLOYMENT_GUIDE.md 开始部署
    echo 3. 开始邀请协作者
    echo.
) else (
    echo.
    echo ❌ 上传失败，请检查：
    echo 1. GitHub 仓库是否已创建
    echo 2. 用户名是否正确
    echo 3. 网络连接是否正常
    echo 4. 是否有仓库访问权限
    echo.
    echo 详细步骤请查看 GITHUB_UPLOAD_GUIDE.md
    echo.
)

pause 