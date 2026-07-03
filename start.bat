@echo off
chcp 65001 >nul
echo 🏫 校园端管理后台 - 启动中...
echo.
cd /d "%~dp0"
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
