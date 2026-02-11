@echo off
chcp 65001 >nul
cls
echo ========================================
echo  ZAERO BOT - Interface Web
echo ========================================
echo.

echo [1/2] Limpando porta 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

timeout /t 1 /nobreak >nul

echo [2/2] Iniciando servidor...
echo.
node api/index.js
