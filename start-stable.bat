@echo off
title 产业生态圈基石人 - 开发服务器

:start
echo.
echo ========================================
echo     产业生态圈基石人 - 启动中...
echo ========================================
echo.

REM 尝试端口 3005
echo 尝试在端口 3005 启动...
call npm run dev -- -p 3005
if %errorlevel% neq 0 (
    echo.
    echo 端口 3005 被占用，尝试端口 3006...
    call npm run dev -- -p 3006
    if %errorlevel% neq 0 (
        echo.
        echo 端口 3006 被占用，尝试端口 3007...
        call npm run dev -- -p 3007
        if %errorlevel% neq 0 (
            echo.
            echo 端口 3007 被占用，尝试端口 3008...
            call npm run dev -- -p 3008
        )
    )
)

echo.
echo 服务器意外停止，3秒后重新启动...
timeout /t 3 /nobreak > nul
goto start 