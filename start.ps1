Write-Host "🏫 校园端管理后台 - 启动中..." -ForegroundColor Cyan
Write-Host ""
Set-Location $PSScriptRoot
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
