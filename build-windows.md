# Windows Build Instructions

## EASIEST APPROACH: Just Run (No Building Required)

For end users who just want to run Tilt on Windows:

```cmd
run-prod.bat
```

This pulls the pre-built image from Docker Hub and runs it. **No building required!**

## If You Must Build Locally

### Option 1: PowerShell (Recommended)
```powershell
# Clear database
if (Test-Path "..\db_data") { Remove-Item "..\db_data" -Recurse -Force }
New-Item -ItemType Directory -Path "..\db_data"

# Build Next.js
Set-Location "..\image\nextjs"
npm install --legacy-peer-deps
npm run build
Set-Location "..\..\build"

# Build Docker image
Set-Location ".."
$env:DOCKER_BUILDKIT=1
docker build --target app --tag tilt-app-x86:latest --file build\Dockerfile.windows --build-arg DEV_MODE=false --build-arg DISPLAY_NUM=1 --build-arg HEIGHT=768 --build-arg WIDTH=1024 .
Set-Location "build"
```

### Option 2: Manual Steps
```cmd
REM 1. Clear database
rmdir /s /q ..\db_data
mkdir ..\db_data

REM 2. Build Next.js manually
cd ..\image\nextjs
npm install --legacy-peer-deps
npm run build
cd ..\..\build

REM 3. Build Docker image
cd ..
set DOCKER_BUILDKIT=1
docker build --target app --tag tilt-app-x86:latest --file build\Dockerfile.windows --build-arg DEV_MODE=false --build-arg DISPLAY_NUM=1 --build-arg HEIGHT=768 --build-arg WIDTH=1024 .
cd build
```

### Option 3: Fix the Batch Script (Advanced)
The `build.bat` script has Windows batch file issues. If you want to debug it, you can try the debug commands in `debug-paths.bat`.

## Release to Docker Hub
After building locally:
```cmd
release.bat
```

## Why Windows Batch Sucks
Windows batch files have issues with:
- Delayed expansion syntax (`!variable!` vs `%variable%`)
- Directory navigation in scripts
- Command chaining
- Environment variables

PowerShell is much more reliable for complex build scripts.