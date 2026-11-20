@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title BSI CRG Dashboard - Build static demo

REM ============================================================
REM  Builds a static, backend-free version of the dashboard into
REM  frontend\dist-demo. Handy for GitHub Pages: no database,
REM  no server, no .env - every API call is answered in memory
REM  (see frontend\src\app\dev\demoFixtures.ts).
REM
REM  Prasyarat: dependency frontend sudah terpasang
REM             (jalankan setup-local.bat sekali).
REM ============================================================

echo.
echo ============================================
echo   BSI CRG Dashboard - Static demo build
echo ============================================
echo.

if not exist "frontend\node_modules\.bin\vite.cmd" (
    echo [ERROR] Dependency frontend belum terpasang.
    echo         Jalankan setup-local.bat sekali dulu, lalu ulangi.
    echo.
    pause
    exit /b 1
)

echo [1/2] Build demo ^(Vite mode=demo^)...
call npm run build:demo --prefix frontend
if errorlevel 1 (
    echo.
    echo [ERROR] Build gagal. Periksa pesan di atas.
    echo.
    pause
    exit /b 1
)

echo.
echo [2/2] Pratinjau di browser ^(http://localhost:4173/demo.html^)...
echo       Tutup jendela ini untuk menghentikan server pratinjau.
echo.
call npm exec --prefix frontend --yes -- vite preview --outDir dist-demo

endlocal
