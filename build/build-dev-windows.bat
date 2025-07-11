@echo off
setlocal enabledelayedexpansion

echo === Building Tilt for Windows (Development Mode) ===
echo - Frontend will use 'npm run dev' for hot reloading
echo - Python will run with live code reloading
echo - Source code will be mounted as volumes
echo - Optimized for Windows x86_64

REM Clean up any existing directories/symlinks
if exist image\nextjs (
    echo Removing existing nextjs...
    rmdir /s /q image\nextjs
)
if exist image\agent (
    echo Removing existing agent...
    rmdir /s /q image\agent
)

REM Clone repositories in parent directory if they don't exist
if not exist ..\tilt-frontend (
    echo Cloning tilt-frontend...
    cd .. && git clone https://github.com/WhyTilt/tilt-frontend.git && cd app
)
if not exist ..\tilt-agent (
    echo Cloning tilt-agent...
    cd .. && git clone https://github.com/WhyTilt/tilt-agent.git && cd app
)

REM Create junction links (Windows equivalent of symlinks)
echo Creating junction links...
mklink /J image\nextjs ..\..\tilt-frontend
mklink /J image\agent ..\..\tilt-agent

echo Junction links created - you can now edit code directly in ..\tilt-frontend and ..\tilt-agent

REM Install npm dependencies for development
echo Installing npm dependencies for development...
cd image\nextjs && npm install && cd ..\..

REM Create db_data directory if it doesn't exist
if not exist db_data mkdir db_data

REM Build with BuildKit for better caching (from parent directory to include repos)
echo Building Docker image for Windows development...
cd .. && set DOCKER_BUILDKIT=1 && docker build ^
    --target app ^
    --tag tilt-dev-windows:latest ^
    --file app/Dockerfile.windows ^
    --build-arg DEV_MODE=true ^
    --build-arg DISPLAY_NUM=1 ^
    --build-arg HEIGHT=768 ^
    --build-arg WIDTH=1024 ^
    . && cd app

echo ✅ Windows development build completed successfully!
echo Use 'run-dev-windows.bat' to start the development container