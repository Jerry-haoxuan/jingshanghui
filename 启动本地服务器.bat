@echo off
title 精尚慧本地开发服务器
color 0A
echo.
echo ==========================================
echo      精尚慧 - 本地开发服务器启动器
echo ==========================================
echo.
echo 正在启动开发服务器...
echo 本地网址: http://localhost:3000
echo.
echo 管理者内测码: ECOSYSTEM2024
echo 会员内测码:   MEMBER2024
echo.
echo 按 Ctrl+C 可停止服务器
echo ==========================================
echo.

cd /d "%~dp0"
npm run dev

pause 