# Build script for Tilt on Windows PowerShell (Production only)

# Error handling
$ErrorActionPreference = "Stop"

Write-Host "=== Building Tilt (Production mode) ==="
Write-Host "Detected platform: Windows"

$IMAGE_TAG = "tilt-app-windows"
$DOCKERFILE = "Dockerfile.windows"
Write-Host "Using Windows build"

Write-Host "- Frontend will be pre-built with 'npm run build'"
Write-Host "- Python will run with optimized settings"
Write-Host "- Database will be cleared for fresh start"

# Clear database for production
Write-Host "Clearing database collections for production..."
if (Test-Path "db_data") {
    try {
        Remove-Item -Path "db_data" -Recurse -Force
    } catch {
        Write-Host "Note: Some database files may have restricted permissions - they will be overwritten on next run"
    }
}
New-Item -ItemType Directory -Path "db_data" | Out-Null
Write-Host "Database cleared"

# Build Next.js for production
Write-Host "Building Next.js for production..."
Push-Location "image\nextjs"
try {
    npm install --legacy-peer-deps
    npm run build
} finally {
    Pop-Location
}

# Build with BuildKit for better caching
Write-Host "Building Docker image ($IMAGE_TAG)..."
$env:DOCKER_BUILDKIT = "1"

# Build the Docker image
docker build `
    --target app `
    --tag "$($IMAGE_TAG):latest" `
    --file "build\$DOCKERFILE" `
    --build-arg "DEV_MODE=false" `
    --build-arg "DISPLAY_NUM=1" `
    --build-arg "HEIGHT=768" `
    --build-arg "WIDTH=1024" `
    .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!"
    exit $LASTEXITCODE
}

Write-Host "✅ Production build completed successfully!"
Write-Host "Image tagged as: $($IMAGE_TAG):latest"
Write-Host "Use '.\run.ps1' to start the production container"