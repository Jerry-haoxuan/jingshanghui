@echo off
title 精尚慧一键启动器
color 0A
echo.
echo ==========================================
echo      精尚慧 - 一键启动器
echo ==========================================
echo.
echo 🚀 正在启动开发服务器...
echo 🌐 本地网址: http://localhost:3000
echo.
echo 🔑 管理者内测码: ECOSYSTEM2024
echo 🔑 会员内测码:   MEMBER2024
echo.
echo 💡 服务器启动后将自动打开浏览器
echo ==========================================
echo.

cd /d "%~dp0"

REM 在后台启动开发服务器
start /B npm run dev

REM 等待5秒让服务器启动
echo 等待服务器启动中...
timeout /t 5 /nobreak >nul

REM 自动打开浏览器
echo 正在打开浏览器...
start http://localhost:3000

echo.
echo ✅ 启动完成！
echo 🌐 浏览器应该已经自动打开 http://localhost:3000
echo 💡 如需停止服务器，请关闭此窗口
echo.
pause 