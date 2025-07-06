@echo off
setlocal enabledelayedexpansion

REM Parse command line arguments
set DEV_MODE=false
if "%1"=="true" set DEV_MODE=true

REM Check if submodules exist, initialize if they don't
echo Checking for required source directories...
if not exist agent\requirements.txt (
    echo Initializing git submodules...
    git submodule init
    git submodule update --recursive
    
    REM If submodules still don't work, clone manually
    if not exist agent\requirements.txt (
        echo Submodules failed, cloning repositories manually...
        if exist agent rmdir /s /q agent
        if exist nextjs rmdir /s /q nextjs
        git clone https://github.com/WhyTilt/tilt-agent.git agent
        git clone https://github.com/WhyTilt/tilt-frontend.git nextjs
    )
)

if not exist nextjs\package.json (
    echo Frontend directory missing, cloning...
    if exist nextjs rmdir /s /q nextjs
    git clone https://github.com/WhyTilt/tilt-frontend.git nextjs
)

REM Verify we have the required files
if not exist agent\requirements.txt (
    echo ERROR: Could not find agent/requirements.txt
    echo Please manually run: git clone https://github.com/WhyTilt/tilt-agent.git agent
    exit /b 1
)

if not exist nextjs\package.json (
    echo ERROR: Could not find nextjs/package.json
    echo Please manually run: git clone https://github.com/WhyTilt/tilt-frontend.git nextjs
    exit /b 1
)

echo ✓ Source directories found

REM Build Docker image using Windows-specific Dockerfile
if "%DEV_MODE%"=="true" (
    echo Building development Docker image...
    docker build --file Dockerfile.windows --build-arg DEV_MODE=true -t tilt .
) else (
    echo Building production Docker image...
    docker build --file Dockerfile.windows --build-arg DEV_MODE=false -t tilt .
)

echo Docker image 'tilt' built successfully!