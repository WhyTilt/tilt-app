@echo off
setlocal enabledelayedexpansion

REM Function to show usage
if "%1"=="help" goto :show_usage
if "%1"=="-h" goto :show_usage
if "%1"=="--help" goto :show_usage

REM Parse command line arguments
set VERSION=""
if "%1"=="" (
    REM Get latest version from git tag and auto-increment
    for /f "delims=" %%i in ('git describe --tags --abbrev=0 2^>nul') do set LATEST_TAG=%%i
    if "!LATEST_TAG!"=="" (
        echo ❌ No git tags found and no version specified
        echo Please create a git tag or specify a version
        goto :show_usage
    )
    
    REM Parse version and auto-increment patch
    echo Latest git tag: !LATEST_TAG!
    set VERSION=!LATEST_TAG!
    echo Using version: !VERSION!
    echo Note: Auto-increment not implemented in Windows batch - using existing tag
) else (
    if "%1"=="help" goto :show_usage
    set VERSION=%1
)

REM Validate version format
echo !VERSION! | findstr "^v[0-9]*\.[0-9]*\.[0-9]*$" >nul
if !errorlevel! neq 0 (
    echo ⚠️  Warning: Version '!VERSION!' doesn't follow semantic versioning ^(vX.Y.Z^)
    set /p CONTINUE="Continue anyway? [y/N]: "
    if "!CONTINUE!" neq "y" if "!CONTINUE!" neq "Y" (
        echo Aborted
        exit /b 1
    )
)

echo === Tilt Release System ===
echo Version: !VERSION!
echo Platform: Windows x86_64
echo Architecture: x86_64
echo.

set REPO_NAME=whytilt/tilt-app-windows
set LOCAL_IMAGE=tilt-app-x86:latest

echo Building Windows image
echo Repository: !REPO_NAME!
echo Version: !VERSION!
echo.

REM Check if Docker is running
docker info >nul 2>&1
if !errorlevel! neq 0 (
    echo ❌ Docker is not running or accessible
    exit /b 1
)

REM Check DockerHub authentication
docker system info | findstr "Username:" >nul
if !errorlevel! neq 0 (
    echo ❌ Not logged in to DockerHub
    echo Please run: docker login
    echo Or if you have a token saved in .env.local:
    echo   Load .env.local and run: echo %%DOCKER_TOKEN%% ^| docker login -u %%DOCKER_USERNAME%% --password-stdin
    exit /b 1
)

echo ✅ Docker authentication verified
echo.

REM Confirm release
echo About to release:
echo   Image: !REPO_NAME!:!VERSION!
echo   Image: !REPO_NAME!:latest
echo.
set /p CONFIRM="Continue with release? [y/N]: "
if "!CONFIRM!" neq "y" if "!CONFIRM!" neq "Y" (
    echo Release cancelled
    exit /b 0
)

echo Checking for existing built image: !LOCAL_IMAGE!
docker image inspect "!LOCAL_IMAGE!" >nul 2>&1
if !errorlevel! neq 0 (
    echo ❌ Image !LOCAL_IMAGE! not found!
    echo Please run build.bat first to build the image
    exit /b 1
)

echo ✅ Found existing image: !LOCAL_IMAGE!
echo Tagging for release...

REM Tag the existing image with release tags
docker tag "!LOCAL_IMAGE!" "!REPO_NAME!:!VERSION!"
docker tag "!LOCAL_IMAGE!" "!REPO_NAME!:latest"

echo ✅ Tagged successfully!

REM Push to DockerHub
echo.
echo Pushing to DockerHub...
echo - !REPO_NAME!:!VERSION!
docker push !REPO_NAME!:!VERSION!

echo - !REPO_NAME!:latest
docker push !REPO_NAME!:latest

echo.
echo ✅ Release completed successfully!
echo.
echo Released images:
echo   🐳 !REPO_NAME!:!VERSION!
echo   🐳 !REPO_NAME!:latest
echo.
echo You can now run:
echo   docker run -p 6080:6080 -p 3001:3001 !REPO_NAME!:!VERSION!
goto :end

:show_usage
echo Usage: %0 [version]
echo.
echo Release script for Tilt - builds and pushes Docker images to DockerHub
echo.
echo Arguments:
echo   version   Version tag ^(e.g., v1.0.0, v1.2.3^)
echo             If not provided, will use latest git tag
echo.
echo Examples:
echo   %0 v1.0.0        # Release specific version
echo   %0               # Release using latest git tag
echo.
echo The script will:
echo   1. Detect platform/architecture
echo   2. Tag existing production Docker image
echo   3. Push to DockerHub with proper naming convention
echo.
echo Image naming convention:
echo   whytilt/tilt-app-windows:VERSION   ^(Windows^)
exit /b 0

:end