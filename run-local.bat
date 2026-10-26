@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title BSI CRG Dashboard - Local Dev

REM ============================================================
REM  BSI CRG Task & Project Monitoring Dashboard
REM  Menjalankan backend (NestJS) + frontend (Vite) sekaligus.
REM  Database: PostgreSQL lokal di port 5432.
REM
REM  Pertama kali? Jalankan sekali:  setup-local.bat
REM  Setiap hari cukup:              run-local.bat
REM ============================================================

echo.
echo ============================================
echo   BSI CRG Dashboard - Starting local dev
echo ============================================
echo.

REM --- 0. Cek Node.js -------------------------------------------
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js tidak ditemukan di PATH.
    echo         Install Node.js 20 LTS dari https://nodejs.org, buka terminal
    echo         baru, lalu jalankan file ini lagi.
    echo.
    pause
    exit /b 1
)

REM --- 1. Cek dependency terpasang -----------------------------
if not exist "backend\node_modules" goto :missing_deps
if not exist "frontend\node_modules" goto :missing_deps
goto :check_env

:missing_deps
echo [ERROR] Dependency belum terpasang.
echo.
echo         Jalankan setup sekali dulu:
echo             setup-local.bat
echo.
echo         (Windows) atau dari root:  npm run setup
echo         (macOS/Linux)           :  npm run setup:unix
echo.
pause
exit /b 1

REM --- 2. Cek file .env ----------------------------------------
:check_env
if not exist "backend\.env" (
    echo [ERROR] backend\.env tidak ditemukan.
    echo.
    echo         File .env berisi DATABASE_URL, JWT_SECRET, dan kredensial SMTP
    echo         sehingga sengaja TIDAK ikut git. Buat dari template:
    echo.
    echo             copy backend\.env.example backend\.env
    echo             copy frontend\.env.example frontend\.env
    echo.
    echo         Lalu isi DATABASE_URL dan JWT_SECRET dengan nilai sebenarnya,
    echo         atau jalankan setup-local.bat yang membuatkannya otomatis.
    echo.
    pause
    exit /b 1
)

REM Pastikan nilai krusial sudah diisi, bukan masih placeholder template.
findstr /I /C:"ISI_PASSWORD_ANDA" /C:"your_password" /C:"replace-with-a-long-random-secret" /C:"GANTI_DENGAN" "backend\.env" >nul 2>&1
if not errorlevel 1 (
    echo [ERROR] backend\.env masih berisi placeholder dari template.
    echo         Isi dulu DATABASE_URL dan JWT_SECRET dengan nilai sebenarnya.
    echo.
    pause
    exit /b 1
)

REM --- 3. Cek PostgreSQL di port 5432 --------------------------
netstat -ano | findstr /R /C:"LISTENING" | findstr ":5432 " >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Tidak ada PostgreSQL yang listen di port 5432.
    echo           Backend akan gagal konek ke database.
    echo.
    echo           Opsi A - pakai Docker ^(paling mudah^):
    echo               docker compose up -d postgres
    echo               ^(user: postgres / superuser, database: bsi_crg_db^)
    echo.
    echo           Opsi B - PostgreSQL lokal / service Windows:
    echo               net start postgresql-x64-18
    echo.
    echo           Jika PostgreSQL belum terinstal, unduh dari:
    echo               https://www.postgresql.org/download/windows/
    echo.
    pause
    exit /b 1
)

REM --- 4. Cek apakah Prisma Client sudah ter-generate ----------
if not exist "backend\node_modules\@prisma\client\runtime\library.d.ts" (
    echo [INFO] Prisma Client belum lengkap, generate ulang...
    call npm run prisma:generate --prefix backend
    if errorlevel 1 (
        echo [ERROR] prisma generate gagal.
        pause
        exit /b 1
    )
)

REM --- 5. Pastikan tabel database sudah ada (migrate + seed) ---
REM Cek ringan: bisa connect ke DB dan tabel User sudah ada?
pushd backend
call node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.user.count().then(()=>process.exit(0)).catch(e=>{console.error(e.code||e.message);process.exit(1)}).finally(()=>p.$disconnect())" >nul 2>&1
set DB_CHECK=!errorlevel!
popd

if not "!DB_CHECK!"=="0" (
    echo [WARNING] Database belum siap ^(belum ada tabel / koneksi gagal^).
    echo           Menjalankan migrate + seed otomatis...
    echo.
    call npm run db:setup --prefix backend
    if errorlevel 1 (
        echo.
        echo [ERROR] Migrate/seed gagal. Periksa DATABASE_URL di backend\.env
        echo         dan pastikan database bsi_crg_db sudah dibuat.
        pause
        exit /b 1
    )
)

REM --- 6. Cek port sudah dipakai atau belum --------------------
netstat -ano | findstr /R /C:"LISTENING" | findstr ":3000 " >nul 2>&1
if not errorlevel 1 (
    echo [WARNING] Port 3000 sudah dipakai. Backend mungkin gagal start.
    echo           Matikan proses lama dengan:
    echo               netstat -ano ^| findstr :3000
    echo.
)

netstat -ano | findstr /R /C:"LISTENING" | findstr ":5173 " >nul 2>&1
if not errorlevel 1 (
    echo [WARNING] Port 5173 sudah dipakai. Vite akan pindah ke port lain.
    echo.
)

REM --- 7. Jalankan backend & frontend di jendela terpisah -----
echo [1/2] Menjalankan backend  -^> http://localhost:3000
start "BSI CRG - Backend" cmd /k "cd /d %~dp0backend && npm run start:dev"

echo [2/2] Menjalankan frontend -^> http://localhost:5173
start "BSI CRG - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ============================================
echo   Kedua server sedang dinyalakan.
echo.
echo   Frontend : http://localhost:5173
echo   Backend  : http://localhost:3000
echo.
echo   Login    : admin@example.com / password123
echo.
echo   Tunggu sekitar 15-30 detik sampai keduanya siap.
echo   Jendela yang muncul JANGAN ditutup selama dipakai.
echo ============================================
echo.

REM --- 8. Buka browser setelah jeda ----------------------------
timeout /t 20 /nobreak >nul
start "" http://localhost:5173

echo Browser dibuka. Tekan tombol apa saja untuk menutup jendela ini.
echo (Server tetap berjalan di jendela masing-masing.)
pause >nul
endlocal
