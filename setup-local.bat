@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title BSI CRG Dashboard - Setup

REM ============================================================
REM  BSI CRG Task & Project Monitoring Dashboard
REM  Setup SEKALI untuk developer baru (Windows).
REM
REM  Yang dilakukan script ini:
REM   1. Cek Node.js
REM   2. Buat backend\.env dan frontend\.env dari .env.example
REM   3. Install dependency backend + frontend
REM   4. Buat database bsi_crg_db di PostgreSQL (jika belum ada)
REM   5. Prisma migrate + seed (akun admin & data contoh)
REM
REM  Setelah selesai, nyalakan aplikasi dengan:  run-local.bat
REM ============================================================

echo.
echo ============================================
echo   BSI CRG Dashboard - One-time setup
echo ============================================
echo.

REM --- 1. Node.js ------------------------------------------------
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js tidak ditemukan di PATH.
    echo         Install Node.js 20 LTS dari https://nodejs.org, buka terminal
    echo         baru, lalu jalankan setup-local.bat lagi.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do echo [OK] Node.js %%v

REM --- 2. File .env ---------------------------------------------
if exist "backend\.env" (
    echo [SKIP] backend\.env sudah ada, tidak ditimpa.
) else (
    copy /y "backend\.env.example" "backend\.env" >nul
    echo [NEW ] backend\.env dibuat dari template.
)

if exist "frontend\.env" (
    echo [SKIP] frontend\.env sudah ada, tidak ditimpa.
) else (
    copy /y "frontend\.env.example" "frontend\.env" >nul
    echo [NEW ] frontend\.env dibuat dari template.
)

REM Isi placeholder DATABASE_URL / JWT_SECRET kalau masih default template.
findstr /I /C:"your_password" /C:"replace-with-a-long-random-secret" "backend\.env" >nul 2>&1
if not errorlevel 1 goto :fill_env
goto :deps

:fill_env
echo.
echo [!] backend\.env masih memakai nilai contoh. Mengisi nilai default lokal...
set /p PG_USER=Pilih user PostgreSQL [default: postgres]:
if "!PG_USER!"=="" set PG_USER=postgres
set /p PG_PASS=Password PostgreSQL untuk user !PG_USER!:
set /p PG_DB=Nama database [default: bsi_crg_db]:
if "!PG_DB!"=="" set PG_DB=bsi_crg_db

for /f "tokens=*" %%s in ('node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"') do set JWT_SECRET=%%s

powershell -NoProfile -Command "$p='backend\.env'; $t=Get-Content -Raw $p; $t=$t -replace '(?m)^DATABASE_URL=.*', 'DATABASE_URL=\"postgresql://!PG_USER!:!PG_PASS!@localhost:5432/!PG_DB!?schema=public\"'; $t=$t -replace '(?m)^JWT_SECRET=.*', 'JWT_SECRET=\"!JWT_SECRET!\"'; Set-Content -NoNewline -Encoding utf8 $p"
if errorlevel 1 (
    echo [ERROR] Gagal menulis backend\.env.
    echo         Edit manual: isi DATABASE_URL dan JWT_SECRET, lalu jalankan ulang.
    pause
    exit /b 1
)
echo [OK] DATABASE_URL dan JWT_SECRET sudah diisi di backend\.env
echo.

REM --- 3. Install dependency -----------------------------------
:deps
echo [1/3] npm install backend...
call npm install --prefix backend
if errorlevel 1 (
    echo [ERROR] npm install backend gagal. Periksa pesan di atas.
    pause
    exit /b 1
)

echo [2/3] npm install frontend...
call npm install --prefix frontend
if errorlevel 1 (
    echo [ERROR] npm install frontend gagal. Periksa pesan di atas.
    pause
    exit /b 1
)

REM --- 4. Pastikan database sudah ada --------------------------
echo [3/3] Menyiapkan database + Prisma...
netstat -ano | findstr /R /C:"LISTENING" | findstr ":5432 " >nul 2>&1
if errorlevel 1 (
    echo.
    echo [WARNING] Tidak ada PostgreSQL yang listen di port 5432.
    echo           Nyalakan dulu dengan salah satu cara:
    echo               docker compose up -d postgres
    echo               net start postgresql-x64-18
    echo.
    echo           Migrate/seed akan dicoba tetap, tapi kemungkinan gagal.
    echo.
)

REM Buat database jika belum ada (error diabaikan: biasanya karena sudah ada).
call npm run db:create --prefix backend


call npm run prisma:generate --prefix backend
if errorlevel 1 goto :setup_failed

call npm run db:migrate --prefix backend
if errorlevel 1 goto :setup_failed

call npm run db:seed --prefix backend
if errorlevel 1 goto :setup_failed

echo.
echo ============================================
echo   Setup selesai.
echo.
echo   Akun admin : admin@example.com / password123
echo.
echo   Sekarang jalankan:  run-local.bat
echo ============================================
echo.
pause
exit /b 0

:setup_failed
echo.
echo [ERROR] Migrate / seed gagal.
echo         Periksa DATABASE_URL di backend\.env (user, password, nama DB)
echo         lalu jalankan setup-local.bat lagi.
echo.
pause
exit /b 1
