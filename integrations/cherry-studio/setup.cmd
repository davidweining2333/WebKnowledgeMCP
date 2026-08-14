@echo off
REM ────────────────────────────────────────────────────────────────────────
REM  Cherry Studio integration — setup script (Windows)
REM  Run this BEFORE configuring the MCP server in Cherry Studio.
REM ────────────────────────────────────────────────────────────────────────
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%\..\.."
set "PROJECT_ROOT=%CD%"
popd

echo ==^> Project root: %PROJECT_ROOT%

REM 1. Install Node.js dependencies
echo ==^> Installing dependencies...
cd /d "%PROJECT_ROOT%"
call pnpm install
if %ERRORLEVEL% neq 0 goto :error

REM 2. Generate Prisma client
echo ==^> Generating Prisma client...
call pnpm prisma:generate
if %ERRORLEVEL% neq 0 goto :error

REM 3. Push database schema
echo ==^> Setting up database...
call pnpm prisma:push
if %ERRORLEVEL% neq 0 goto :error

REM 4. Build the project
echo ==^> Building project...
call pnpm build
if %ERRORLEVEL% neq 0 goto :error

REM 5. Install Playwright browsers (Chromium)
REM    If the default CDN is blocked (common in China), set the mirror:
REM    set PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright/
echo ==^> Installing Playwright browser (Chromium)...
if not defined PLAYWRIGHT_DOWNLOAD_HOST (
    echo      (using default CDN; if download fails, re-run with --mirror)
)
call npx playwright install chromium
if %ERRORLEVEL% neq 0 (
    echo.
    echo [!] Playwright download failed.
    echo     Try the China mirror:
    echo       set PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright/
    echo       npx playwright install chromium
    echo     Or re-run: setup.cmd --mirror
    goto :error
)

echo.
echo =============================================
echo  Setup complete!
echo  LAUNCHER PATH: %PROJECT_ROOT%\integrations\cherry-studio\launcher.mjs
echo.
echo  Copy this path into your Cherry Studio MCP config.
echo  (Use forward slashes: C:/path/to/.../launcher.mjs)
echo =============================================
goto :end

:error
echo.
echo =============================================
echo  SETUP FAILED! Check the error messages above.
echo =============================================
exit /b 1

:end
endlocal