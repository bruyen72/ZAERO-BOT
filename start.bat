@echo off
cls
echo.
echo ==========================================
echo   ZAERO BOT - Iniciando...
echo ==========================================
echo.

REM Limpar porta 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

echo Servidor iniciando na porta 3000...
echo.

node api/index.js
