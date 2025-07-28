@echo off
echo 正在启动产业生态圈基石人项目...
echo.
echo 尝试在端口 3000 启动...
call npm run dev -- -p 3000
if %errorlevel% neq 0 (
    echo.
    echo 端口 3000 被占用，尝试端口 3001...
    call npm run dev -- -p 3001
    if %errorlevel% neq 0 (
        echo.
        echo 端口 3001 被占用，尝试端口 3002...
        call npm run dev -- -p 3002
        if %errorlevel% neq 0 (
            echo.
            echo 端口 3002 被占用，尝试端口 3003...
            call npm run dev -- -p 3003
        )
    )
) 