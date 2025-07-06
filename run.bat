@echo off
setlocal enabledelayedexpansion

REM Clear logs directory
if exist logs rmdir /s /q logs
mkdir logs

REM Parse command line arguments
set DEV_MODE=false
:parse_args
if "%1"=="--dev" (
    set DEV_MODE=true
    shift
    goto parse_args
)
if not "%1"=="" (
    shift
    goto parse_args
)

REM Load .env.local file if it exists
if exist .env.local (
    echo Loading environment variables from .env.local...
    for /f "usebackq tokens=*" %%a in (.env.local) do (
        echo %%a | findstr /v "^#" > nul && set %%a
    )
)

REM Build if needed
if "%DEV_MODE%"=="true" (
    echo Development mode: Building Docker image without pre-building Next.js...
    if exist build.bat (
        call build.bat %DEV_MODE%
    ) else (
        docker build --build-arg DEV_MODE=true -t tilt .
    )
) else (
    echo Production mode: Building apps and copying files to ./image/ BEFORE container build
    
    REM Build Next.js for production FIRST
    echo Building Next.js for production...
    cd nextjs
    if exist .next rmdir /s /q .next
    mkdir .next
    npm run build
    cd ..
    
    REM Copy all files to ./image/ directory
    echo Copying all files to ./image/ directory...
    
    REM Copy agent directory (built Python app)
    xcopy /s /e /y agent image\
    
    REM Copy nextjs directory (built Next.js app with .next folder)
    xcopy /s /e /y nextjs image\
    
    REM Copy other necessary files
    if exist pyproject.toml copy pyproject.toml image\ >nul 2>&1
    if exist ruff.toml copy ruff.toml image\ >nul 2>&1
    if exist CLAUDE.md copy CLAUDE.md image\ >nul 2>&1
    if exist README.md copy README.md image\ >nul 2>&1
    if exist LICENSE copy LICENSE image\ >nul 2>&1
    
    echo Pre-built apps copied to ./image/ successfully!
    
    REM Build Docker image with pre-built apps
    if exist build.bat (
        call build.bat %DEV_MODE%
    ) else (
        docker build --build-arg DEV_MODE=false -t tilt .
    )
)

REM Set up Docker environment variables
set DOCKER_ENV_VARS=-e DEV_MODE=%DEV_MODE%

REM Create db_data directory if it doesn't exist
if not exist db_data mkdir db_data

REM Get current directory (Windows version)
set CURRENT_DIR=%cd%

docker run ^
    %DOCKER_ENV_VARS% ^
    -v "%CURRENT_DIR%\user_data":/home/tilt/user_data ^
    -v "%CURRENT_DIR%\user_data\.mozilla":/home/tilt/.mozilla ^
    -v "%CURRENT_DIR%\user_data\.config\gtk-3.0":/home/tilt/.config/gtk-3.0 ^
    -v "%CURRENT_DIR%\user_data\.config\gtk-2.0":/home/tilt/.config/gtk-2.0 ^
    -v "%CURRENT_DIR%\user_data\.config\libreoffice":/home/tilt/.config/libreoffice ^
    -v "%CURRENT_DIR%\user_data\.config\pulse":/home/tilt/.config/pulse ^
    -v "%CURRENT_DIR%\user_data\.local":/home/tilt/.local ^
    -v "%CURRENT_DIR%\user_data\.cache":/home/tilt/.cache ^
    -v "%CURRENT_DIR%\user_data\Desktop":/home/tilt/Desktop ^
    -v "%CURRENT_DIR%\user_data\Documents":/home/tilt/Documents ^
    -v "%CURRENT_DIR%\user_data\Downloads":/home/tilt/Downloads ^
    -v "%CURRENT_DIR%\logs":/home/tilt/logs ^
    -v "%CURRENT_DIR%\db_data":/data/db ^
    -v "%CURRENT_DIR%\nextjs":/home/tilt/nextjs ^
    -v "%CURRENT_DIR%\agent":/home/tilt/agent ^
    -v "%CURRENT_DIR%\image":/home/tilt/image ^
    -p 5900:5900 ^
    -p 3001:3001 ^
    -p 6080:6080 ^
    -p 8000:8000 ^
    -p 27017:27017 ^
    -it tilt:latest

echo.
echo ➡️  Open http://localhost:3001 for Tilt