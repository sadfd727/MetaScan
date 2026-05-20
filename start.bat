@echo off
chcp 65001 >nul
title MetaScan 智能健康管理平台

echo ================================================
echo   MetaScan 智能健康管理平台 - 一键启动
echo ================================================
echo.

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [×] 未检测到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)
echo [√] Node.js 已检测到: 
node --version

:: 检查依赖
if not exist "node_modules" (
    echo [!] 正在安装依赖...
    npm install
    if %errorlevel% neq 0 (
        echo [×] 依赖安装失败
        pause
        exit /b 1
    )
    echo [√] 依赖安装完成
)

:: 构建前端 (可选，首次运行时执行)
echo [→] 正在构建前端资源...
call npx vite build --logLevel silent
if %errorlevel% neq 0 (
    echo [!] 前端构建失败，使用已有资源
) else (
    echo [√] 前端构建完成
)

:: 终止已占用的端口
echo [→] 检查端口占用...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING" 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
    echo [√] 已终止旧进程 PID:%%a
)

:: 启动服务器
echo.
echo ================================================
echo   服务器启动中...
echo   HTTP API:  http://localhost:3001/api
echo   WebSocket: ws://localhost:3001/ws
echo   导出服务:  PDF(向量)/Word/Excel
echo   主页:      http://localhost:3001
echo ================================================
echo.

start http://localhost:3001
node server.mjs

pause