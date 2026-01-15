@echo off
chcp 65001 > nul
title TETRA AI Debate Protocol - Service Starter
color 0A

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║           🔷 TETRA AI Debate Protocol - Starter                ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

:: Dizin kontrolü
if not exist "app" (
    echo [HATA] app klasoru bulunamadi!
    pause
    exit /b 1
)

if not exist "backend" (
    echo [HATA] backend klasoru bulunamadi!
    pause
    exit /b 1
)

echo [1/2] Backend servisi baslatiliyor (Port 3001)...
start "TETRA Backend" cmd /k "cd /d %~dp0backend && npm start"

:: Backend'in ayağa kalkması için kısa bekle
timeout /t 2 /nobreak > nul

echo [2/2] Frontend servisi baslatiliyor (Port 5173)...
start "TETRA Frontend" cmd /k "cd /d %~dp0app && npm run dev"

echo.
echo ════════════════════════════════════════════════════════════════
echo.
echo   ✅ Servisler baslatildi!
echo.
echo   📦 Backend:  http://localhost:3001
echo   🌐 Frontend: http://localhost:5173
echo.
echo   💡 Servisleri durdurmak icin acilan terminal pencerelerini kapatin.
echo.
echo ════════════════════════════════════════════════════════════════
echo.

:: 3 saniye sonra tarayıcıyı aç
timeout /t 3 /nobreak > nul
start http://localhost:5173

echo Tarayici acildi. Bu pencereyi kapatabilirsiniz.
pause
