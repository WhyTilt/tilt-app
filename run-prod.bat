@echo off
setlocal enabledelayedexpansion

echo === Running Tilt (Production Mode) ===

echo Detected platform: Windows x86_64
echo Using Windows production image

set IMAGE_TAG=tilt-app-x86

REM Stop any existing containers using port 3001
echo Checking for existing containers on port 3001...
for /f "tokens=1" %%i in ('docker ps --filter "publish=3001" --format "{{.ID}}"') do (
    echo Stopping existing container using port 3001: %%i
    docker stop %%i
    echo Container stopped
)

REM Clear logs directory
if exist logs rmdir /s /q logs
mkdir logs

REM Load .env.local file if it exists
if exist .env.local (
    echo Loading environment variables from .env.local...
    for /f "usebackq tokens=*" %%a in (.env.local) do (
        echo %%a | findstr /v "^#" > nul && set %%a
    )
)

REM Check if prod image exists
docker images -q !IMAGE_TAG!:latest > nul 2>&1
if !errorlevel! neq 0 (
    echo Production image not found. Building...
    call build\build-prod.bat
)

REM Create necessary directories
if not exist db_data mkdir db_data

echo Starting production container (!IMAGE_TAG!)...
echo - Frontend: Pre-built and optimized
echo - Backend: Production configuration

docker run ^
    -e DEV_MODE=false ^
    -v "%cd%\user_data":/home/tilt/user_data ^
    -v "%cd%\user_data\.mozilla":/home/tilt/.mozilla ^
    -v "%cd%\user_data\.config\gtk-3.0":/home/tilt/.config/gtk-3.0 ^
    -v "%cd%\user_data\.config\gtk-2.0":/home/tilt/.config/gtk-2.0 ^
    -v "%cd%\user_data\.config\libreoffice":/home/tilt/.config/libreoffice ^
    -v "%cd%\user_data\.config\pulse":/home/tilt/.config/pulse ^
    -v "%cd%\user_data\.local":/home/tilt/.local ^
    -v "%cd%\user_data\.cache":/home/tilt/.cache ^
    -v "%cd%\user_data\Desktop":/home/tilt/Desktop ^
    -v "%cd%\user_data\Documents":/home/tilt/Documents ^
    -v "%cd%\user_data\Downloads":/home/tilt/Downloads ^
    -v "%cd%\logs":/home/tilt/logs ^
    -v "%cd%\db_data":/data/db ^
    -p 5900:5900 ^
    -p 3001:3001 ^
    -p 6080:6080 ^
    -p 8000:8000 ^
    -p 27017:27017 ^
    -it !IMAGE_TAG!:latest

echo.
echo ➡️  Production server started!
echo ➡️  Frontend: http://localhost:3001
echo ➡️  Backend API: http://localhost:8000
echo ➡️  VNC Web: http://localhost:6080