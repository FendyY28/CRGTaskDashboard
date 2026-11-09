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

REM Konvensi: setiap perintah disimpan exit code-nya dengan `set VAR=!errorlevel!`
REM tepat setelah perintah dijalankan.
REM Catatan: `exit /b N` di dalam blok `( )` TIDAK menghentikan script. Subroutine
REM di bawah mencatat masalah lewat :fail / :warn lalu keluar dengan `goto :eof`;
REM script utama yang memutuskan berhenti berdasarkan FAIL_COUNT.
set "STANDBY_MESSAGE=Jalankan setup sekali dulu: setup-local.bat"
set "FAIL_COUNT=0"

echo.
echo ============================================
echo   BSI CRG Dashboard - Starting local dev
echo ============================================
echo.

REM --- Main sequence: setiap cek mencatat kegagalan; berhenti di sini kalau ada ---
call :check_node
call :check_deps
call :check_env
call :check_db
call :check_ports

if not "!FAIL_COUNT!"=="0" goto :abort

call :start_servers

timeout /t 3 /nobreak >nul
call :wait_for_servers

if not "!FAIL_COUNT!"=="0" goto :abort

start "" http://localhost:5173

echo.
echo Browser dibuka. Tekan tombol apa saja untuk menutup jendela ini.
echo (Server tetap berjalan di jendela masing-masing.)
pause >nul
endlocal
exit /b 0

:abort
echo.
echo   Startup dibatalkan. Perbaiki masalah di atas lalu jalankan ulang file ini.
echo.
pause
endlocal
exit /b 1

REM ============================================================
REM  SUBROUTINES - panggil :fail untuk masalah yang memblokir, :warn
REM  untuk yang hanya diperingatkan. Jangan pakai `exit /b 1` di dalam
REM  blok `( )`: exit di sana hanya keluar dari blok, bukan dari script.
REM ============================================================

:check_node
REM --- 0. Cek Node.js -------------------------------------------
where node >nul 2>&1
if not "!errorlevel!"=="0" (
    call :fail "Node.js tidak ditemukan di PATH. Install Node.js 20 LTS dari https://nodejs.org, buka terminal baru, lalu jalankan file ini lagi."
)
goto :eof

:check_deps
REM --- 1. Cek dependency terpasang (termasuk instalasi yang tidak lengkap) ---
set "DEPS_MISSING=0"
if not exist "backend\node_modules" set "DEPS_MISSING=1"
if not exist "frontend\node_modules" set "DEPS_MISSING=1"
REM Marker binary: node_modules ada tetapi install-nya belum lengkap.
if not exist "backend\node_modules\.bin\nest.cmd" set "DEPS_MISSING=1"
if not exist "frontend\node_modules\.bin\vite.cmd" set "DEPS_MISSING=1"
if "!DEPS_MISSING!"=="1" (
    call :fail "Dependency belum terpasang lengkap (node_modules atau marker .bin hilang). Jalankan setup sekali dulu: setup-local.bat (Windows), atau dari root: npm run setup / npm run setup:unix."
)
goto :eof

:check_env
REM --- 2. Cek file .env ----------------------------------------
if not exist "backend\.env" (
    call :fail "backend\.env tidak ditemukan. File ini berisi DATABASE_URL, JWT_SECRET, dan kredensial SMTP sehingga sengaja TIDAK ikut git. Buat dari template: copy backend\.env.example backend\.env dan copy frontend\.env.example frontend\.env, lalu isi nilainya (atau jalankan setup-local.bat yang membuatkannya otomatis)."
    goto :eof
)
if not exist "frontend\.env" (
    if exist "frontend\.env.example" (
        echo [WARNING] frontend\.env belum ada. Disalin otomatis dari frontend\.env.example.
        copy /y "frontend\.env.example" "frontend\.env" >nul
        set "FRONTEND_ENV_COPY=!errorlevel!"
        if not "!FRONTEND_ENV_COPY!"=="0" echo           ^(penyalinan gagal, Vite mungkin memakai nilai default^)
    )
)

REM Cek per variabel kunci: nilainya masih memuat nilai template.
set "PLACEHOLDER_DATABASE_URL=postgresql://postgres:your_password@localhost:5432/bsi_crg_db?schema=public"
set "PLACEHOLDER_DATABASE_URL_SHORT=postgresql://postgres:your_password@"
set "PLACEHOLDER_JWT_SECRET=replace-with-a-long-random-secret"
set "PLACEHOLDER_MAIL_USER=your_email@gmail.com"
set "PLACEHOLDER_MAIL_PASS=your_gmail_app_password"

set "ENV_PLACEHOLDER_ERRORS=0"
call :check_env_value "DATABASE_URL" "PLACEHOLDER_DATABASE_URL"
call :check_env_value "DATABASE_URL" "PLACEHOLDER_DATABASE_URL_SHORT"
call :check_env_value "JWT_SECRET" "PLACEHOLDER_JWT_SECRET"
call :check_env_value "MAIL_USER" "PLACEHOLDER_MAIL_USER"
call :check_env_value "MAIL_PASS" "PLACEHOLDER_MAIL_PASS"

if not "!ENV_PLACEHOLDER_ERRORS!"=="0" (
    call :fail "backend\.env masih berisi nilai template untuk variabel di atas. Isi dengan nilai sebenarnya (JWT_SECRET bisa dibuat dengan: openssl rand -hex 32)."
)
goto :eof

:check_env_value
REM %1 = nama variabel, %2 = nama variabel yang memuat nilai template
findstr /R /C:"^[ ]*%1=" "backend\.env" | findstr /L /C:"!%~2!" >nul 2>&1
set "ENV_VALUE_MATCH=!errorlevel!"
if "!ENV_VALUE_MATCH!"=="0" (
    echo [ERROR]   - %1 masih memakai nilai dari template.
    set /a ENV_PLACEHOLDER_ERRORS+=1
    set "ENV_PLACEHOLDER_ERRORS=!ENV_PLACEHOLDER_ERRORS!"
)
goto :eof

:check_db
REM --- 3. Cek database: hanya untuk host lokal, tidak memblokir selain itu ---
set "DB_HOST=localhost"
for /f "usebackq tokens=1 delims=: " %%H in (`node "%~dp0backend\scripts\db-host.js" 2^>nul`) do set "DB_HOST=%%H"
set "DB_HOST_CHECK=!errorlevel!"
if not "!DB_HOST_CHECK!"=="0" set "DB_HOST=localhost"

set "DB_IS_LOCAL=0"
if /I "!DB_HOST!"=="localhost" set "DB_IS_LOCAL=1"
if /I "!DB_HOST!"=="127.0.0.1" set "DB_IS_LOCAL=1"
if /I "!DB_HOST!"=="::1" set "DB_IS_LOCAL=1"

if "!DB_IS_LOCAL!"=="1" (
    netstat -ano | findstr /R /C:"LISTENING" | findstr ":5432 " >nul 2>&1
    set "PG_PORT_USED=!errorlevel!"
    if not "!PG_PORT_USED!"=="0" (
        echo [WARNING] Tidak ada PostgreSQL yang listen di port 5432 ^(host database: !DB_HOST!^).
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
        call :fail "PostgreSQL belum berjalan di localhost:5432."
        goto :eof
    )
) else (
    echo [INFO] Host database: !DB_HOST! ^(bukan lokal, cek port 5432 dilewati^).
)

REM --- 4. Cek apakah Prisma Client sudah ter-generate ----------
if not exist "backend\node_modules\@prisma\client\runtime\library.d.ts" (
    echo [INFO] Prisma Client belum lengkap, generate ulang...
    call npm run prisma:generate --prefix backend
    set "PRISMA_GENERATE_EXIT=!errorlevel!"
    if not "!PRISMA_GENERATE_EXIT!"=="0" (
        call :fail "prisma generate gagal."
        goto :eof
    )
)

REM --- 5. Pastikan tabel database sudah ada (migrate + seed) ---
REM Cek read-only lewat script terpisah: bisa connect dan tabel User sudah ada?
call npm run db:check --prefix backend >nul 2>&1
set "DB_CHECK=!errorlevel!"

if not "!DB_CHECK!"=="0" (
    echo [WARNING] Database belum siap ^(belum ada tabel / koneksi gagal^).
    echo           Menjalankan migrate + seed otomatis...
    echo.
    call npm run db:setup --prefix backend
    set "DB_SETUP_EXIT=!errorlevel!"
    if not "!DB_SETUP_EXIT!"=="0" (
        call :fail "Migrate/seed gagal. Periksa DATABASE_URL di backend\.env dan pastikan database bsi_crg_db sudah dibuat."
        goto :eof
    )
)
goto :eof

:check_ports
REM --- 6. Port harus bebas sebelum server dijalankan ------------
set "PORT_CONFLICT=0"

netstat -ano | findstr /R /C:"LISTENING" | findstr ":3000 " >nul 2>&1
set "BACKEND_PORT_USED=!errorlevel!"
if "!BACKEND_PORT_USED!"=="0" (
    set "PORT_CONFLICT=1"
    call :describe_port_owner 3000 Backend
)

netstat -ano | findstr /R /C:"LISTENING" | findstr ":5173 " >nul 2>&1
set "FRONTEND_PORT_USED=!errorlevel!"
if "!FRONTEND_PORT_USED!"=="0" (
    set "PORT_CONFLICT=1"
    call :describe_port_owner 5173 Frontend
)

if "!PORT_CONFLICT!"=="1" (
    echo.
    echo [ERROR] Port di atas sudah dipakai, jendela server akan langsung gagal start.
    echo           Tutup aplikasi tersebut, atau akhiri prosesnya dengan:
    echo               taskkill /PID ^<PID^> /F
    echo           ^(PID tertera di atas, atau cek dengan: netstat -ano ^| findstr :3000^)
    call :fail "Port 3000 dan/atau 5173 sudah dipakai proses lain."
    goto :eof
)
goto :eof

:describe_port_owner
REM %1 = port, %2 = label layanan
echo [ERROR] Port %1 sudah dipakai oleh: %2
set "PORT_OWNERS="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:"LISTENING" ^| findstr ":%1 " 2^>nul') do (
    echo !PORT_OWNERS! | findstr /L /C:"#%%P#" >nul 2>&1
    if errorlevel 1 (
        set "PORT_OWNERS=!PORT_OWNERS!#%%P#"
        for /f "tokens=1,* delims=," %%A in ('tasklist /FI "PID eq %%P" /FO CSV /NH 2^>nul') do (
            echo           PID %%P ^(%%~A^) - akhiri dengan: taskkill /PID %%P /F
        )
    )
)
goto :eof

:start_servers
REM --- 7. Jalankan backend & frontend di jendela terpisah -----
echo [1/2] Menjalankan backend  -^> http://localhost:3000
start "BSI CRG - Backend" cmd /k "cd /d ""%~dp0backend"" && npm run start:dev"

echo [2/2] Menjalankan frontend -^> http://localhost:5173
start "BSI CRG - Frontend" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"

echo.
echo ============================================
echo   Kedua server sedang dinyalakan (menunggu siap...).
echo.
echo   Frontend : http://localhost:5173
echo   Backend  : http://localhost:3000
echo.
echo   Login    : admin@example.com / password123
echo.
echo   Jendela yang muncul JANGAN ditutup selama dipakai.
echo ============================================
echo.
goto :eof

:wait_for_servers
REM --- 8. Tunggu kedua server benar-benar listen, bukan sekadar delay ---
call :wait_for_port 3000 "BSI CRG - Backend" 90
if not "!FAIL_COUNT!"=="0" goto :eof
call :wait_for_port 5173 "BSI CRG - Frontend" 90
goto :eof

:wait_for_port
REM %1 = port, %2 = judul jendela server, %3 = batas percobaan (x1 detik)
set "WAIT_PORT=%~1"
set "WAIT_TITLE=%~2"
set "WAIT_LIMIT=%~3"
set "WAIT_TRIES=0"
:wait_for_port_loop
netstat -ano | findstr /R /C:"LISTENING" | findstr ":!WAIT_PORT! " >nul 2>&1
if "!errorlevel!"=="0" goto :eof
set /a WAIT_TRIES+=1
set "WAIT_TRIES=!WAIT_TRIES!"
if !WAIT_TRIES! GEQ !WAIT_LIMIT! (
    call :fail "Port !WAIT_PORT! belum listen setelah !WAIT_LIMIT! detik. Cek pesan error di jendela \"!WAIT_TITLE!\"."
    goto :eof
)
timeout /t 1 /nobreak >nul
goto :wait_for_port_loop

:fail
REM %~1 = pesan; menambah hitungan kegagalan lalu kembali ke pemanggil.
echo [ERROR] %~1
echo.
set /a FAIL_COUNT+=1
goto :eof

:warn
echo [WARNING] %~1
echo.
goto :eof
