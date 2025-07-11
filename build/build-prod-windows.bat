@echo off
setlocal enabledelayedexpansion

echo === Building Tilt for Windows (Production Mode) ===
echo - Frontend will be pre-built with 'npm run build'
echo - Python will run with optimized settings
echo - Database will be cleared for fresh start
echo - Optimized for Windows x86_64
echo - Will build image: tilt-app-x86

REM Clear database for production
echo Clearing database collections for production...
if exist db_data rmdir /s /q db_data
mkdir db_data
echo Database cleared

REM Set up repositories for production build using submodules
echo Setting up repositories for production build using submodules...

REM Clean up any existing directories/symlinks
if exist image\nextjs (
    echo Removing existing nextjs...
    rmdir /s /q image\nextjs
)
if exist image\agent (
    echo Removing existing agent...
    rmdir /s /q image\agent
)

REM Initialize and update submodules for production
echo Setting up git submodules for production...

REM Remove from git index if they exist
git rm --cached image/nextjs 2>nul || echo >nul
git rm --cached image/agent 2>nul || echo >nul

REM Add submodules (force add since they're in .gitignore)
git submodule add -f https://github.com/WhyTilt/tilt-frontend.git image/nextjs || echo Submodule image/nextjs already exists
git submodule add -f https://github.com/WhyTilt/tilt-agent.git image/agent || echo Submodule image/agent already exists

REM Update submodules to latest
git submodule update --init --recursive

REM Build Next.js for production
echo Building Next.js for production...
cd image\nextjs
npm install --legacy-peer-deps
npm run build
cd ..\..

REM Build with BuildKit for better caching
echo Building Docker image for Windows production...
set DOCKER_BUILDKIT=1
docker build ^
    --target app ^
    --tag tilt-app-x86:latest ^
    --file Dockerfile.windows ^
    --build-arg DEV_MODE=false ^
    --build-arg DISPLAY_NUM=1 ^
    --build-arg HEIGHT=768 ^
    --build-arg WIDTH=1024 ^
    ..

echo ✅ Windows production build completed successfully!
echo Image tagged as: tilt-app-x86:latest
echo Use 'run-prod-windows.bat' to start the production container