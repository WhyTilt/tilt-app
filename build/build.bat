@echo off
setlocal enabledelayedexpansion

REM Function to show usage
if "%1"=="help" goto :show_usage
if "%1"=="-h" goto :show_usage
if "%1"=="--help" goto :show_usage

REM Parse command line arguments
set MODE=""
if "%1"=="" (
    REM Interactive mode - prompt user
    echo === Tilt Build System ===
    echo Choose build mode:
    echo   1^) Development ^(hot reload, npm run dev^)
    echo   2^) Production ^(optimized, npm run build^)
    echo.
    set /p choice="Enter choice [1-2]: "
    if "!choice!"=="1" set MODE=dev
    if "!choice!"=="2" set MODE=prod
    if "!MODE!"=="" (
        echo Invalid choice. Exiting.
        exit /b 1
    )
) else (
    if "%1"=="dev" set MODE=dev
    if "%1"=="development" set MODE=dev
    if "%1"=="prod" set MODE=prod
    if "%1"=="production" set MODE=prod
    if "!MODE!"=="" (
        echo Invalid mode: %1
        goto :show_usage
    )
)

echo === Building Tilt ^(!MODE! mode^) ===
echo Detected platform: Windows x86_64
echo Using Windows build

if "!MODE!"=="dev" (
    set IMAGE_TAG=tilt-dev-x86
    set DOCKERFILE=Dockerfile.windows
) else (
    set IMAGE_TAG=tilt-app-x86
    set DOCKERFILE=Dockerfile.windows
)

if "!MODE!"=="dev" (
    echo - Frontend will use 'npm run dev' for hot reloading
    echo - Python will run with live code reloading
    echo - Source code will be mounted as volumes
    
    REM Clean up any existing directories/symlinks
    if exist ..\image\nextjs (
        echo Removing existing nextjs...
        rmdir /s /q ..\image\nextjs
    )
    if exist ..\image\agent (
        echo Removing existing agent...
        rmdir /s /q ..\image\agent
    )
    
    REM Clone repositories in parent directory if they don't exist
    if not exist ..\..\tilt-frontend (
        echo Cloning tilt-frontend...
        cd ..\.. && git clone https://github.com/WhyTilt/tilt-frontend.git && cd app\build
    )
    if not exist ..\..\tilt-agent (
        echo Cloning tilt-agent...
        cd ..\.. && git clone https://github.com/WhyTilt/tilt-agent.git && cd app\build
    )
    
    REM Create junction links (Windows equivalent of symlinks)
    echo Creating junction links...
    mklink /J ..\image\nextjs ..\..\..\tilt-frontend
    mklink /J ..\image\agent ..\..\..\tilt-agent
    
    echo Junction links created - you can now edit code directly in ..\..\tilt-frontend and ..\..\tilt-agent
    
    REM Install npm dependencies for development
    echo Installing npm dependencies for development...
    cd ..\image\nextjs && npm install && cd ..\..\build
    
    REM Create db_data directory if it doesn't exist
    if not exist ..\db_data mkdir ..\db_data
    
    set DEV_MODE_ARG=true
) else (
    echo - Frontend will be pre-built with 'npm run build'
    echo - Python will run with optimized settings
    echo - Database will be cleared for fresh start
    
    REM Clear database for production
    echo Clearing database collections for production...
    if exist ..\db_data rmdir /s /q ..\db_data
    mkdir ..\db_data
    echo Database cleared
    
    REM Set up repositories for production build using submodules
    echo Setting up repositories for production build using submodules...
    
    REM Clean up any existing directories/symlinks
    if exist ..\image\nextjs (
        echo Removing existing nextjs...
        rmdir /s /q ..\image\nextjs
    )
    if exist ..\image\agent (
        echo Removing existing agent...
        rmdir /s /q ..\image\agent
    )
    
    REM Initialize and update submodules for production
    echo Setting up git submodules for production...
    
    REM Remove from git index if they exist
    cd .. && git rm --cached image\nextjs 2>nul || echo >nul
    git rm --cached image\agent 2>nul || echo >nul
    
    REM Add submodules (force add since they're in .gitignore)
    git submodule add -f https://github.com/WhyTilt/tilt-frontend.git image\nextjs || echo Submodule image\nextjs already exists
    git submodule add -f https://github.com/WhyTilt/tilt-agent.git image\agent || echo Submodule image\agent already exists
    
    REM Update submodules to latest
    git submodule update --init --recursive && cd build
    
    REM Build Next.js for production
    echo Building Next.js for production...
    cd ..\image\nextjs
    npm install --legacy-peer-deps
    npm run build
    cd ..\..\build
    
    set DEV_MODE_ARG=false
)

REM Build with BuildKit for better caching
echo Building Docker image ^(!IMAGE_TAG!^)...
cd ..\.. && set DOCKER_BUILDKIT=1 && docker build ^
    --target app ^
    --tag !IMAGE_TAG!:latest ^
    --file app\!DOCKERFILE! ^
    --build-arg DEV_MODE=!DEV_MODE_ARG! ^
    --build-arg DISPLAY_NUM=1 ^
    --build-arg HEIGHT=768 ^
    --build-arg WIDTH=1024 ^
    . && cd app\build

echo ✅ !MODE! build completed successfully!
echo Image tagged as: !IMAGE_TAG!:latest
if "!MODE!"=="dev" (
    echo Use '..\run-dev.bat' to start the development container
) else (
    echo Use '..\run-prod.bat' to start the production container
)
goto :end

:show_usage
echo Usage: %0 [dev^|prod]
echo.
echo Build modes:
echo   dev   - Development build ^(npm run dev, hot reload^)
echo   prod  - Production build ^(npm run build, optimized^)
echo.
echo Examples:
echo   %0 dev    # Build for development
echo   %0 prod   # Build for production
echo   %0        # Interactive prompt
exit /b 0

:end