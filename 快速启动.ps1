# 精尚慧快速启动器 (PowerShell版本)
$Host.UI.RawUI.WindowTitle = "精尚慧本地开发服务器"

# 设置颜色
$Host.UI.RawUI.BackgroundColor = "Black"
$Host.UI.RawUI.ForegroundColor = "Green"
Clear-Host

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "     精尚慧 - 本地开发服务器启动器" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 正在启动开发服务器..." -ForegroundColor Green
Write-Host "🌐 本地网址: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "🔑 管理者内测码: ECOSYSTEM2024" -ForegroundColor Magenta
Write-Host "🔑 会员内测码:   MEMBER2024" -ForegroundColor Magenta
Write-Host ""
Write-Host "💡 按 Ctrl+C 可停止服务器" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 切换到脚本所在目录
Set-Location $PSScriptRoot

# 启动开发服务器
Start-Process "npm" -ArgumentList "run", "dev" -NoNewWindow -Wait

# 5秒后自动打开浏览器
Start-Sleep 5
Start-Process "http://localhost:3000"

Read-Host "按回车键关闭此窗口" 