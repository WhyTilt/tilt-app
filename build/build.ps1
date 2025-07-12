# Tilt Build System - PowerShell
param(
    [Parameter(Position=0)]
    [ValidateSet("dev", "development", "prod", "production", "help", "-h", "--help")]
    [string]$Mode = $null
)

# Function to show usage
function Show-Usage {
    Write-Host "Usage: .\build.ps1 [dev|prod]"
    Write-Host ""
    Write-Host "Build modes:"
    Write-Host "  dev   - Development build (npm run dev, hot reload)"
    Write-Host "  prod  - Production build (npm run build, optimized)"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\build.ps1 dev    # Build for development"
    Write-Host "  .\build.ps1 prod   # Build for production"
    Write-Host "  .\build.ps1        # Interactive prompt"
}

# Handle help
if ($Mode -in @("help", "-h", "--help")) {
    Show-Usage
    exit 0
}

# Interactive mode if no arguments
if (-not $Mode) {
    Write-Host "=== Tilt Build System ==="
    Write-Host "Choose build mode:"
    Write-Host "  1) Development (hot reload, npm run dev)"
    Write-Host "  2) Production (optimized, npm run build)"
    Write-Host ""
    $choice = Read-Host "Enter choice [1-2]"
    
    switch ($choice) {
        "1" { $Mode = "dev" }
        "2" { $Mode = "prod" }
        default {
            Write-Host "Invalid choice. Exiting."
            exit 1
        }
    }
}

# Normalize mode
if ($Mode -in @("development")) { $Mode = "dev" }
if ($Mode -in @("production")) { $Mode = "prod" }

if ($Mode -notin @("dev", "prod")) {
    Write-Host "Invalid mode: $Mode"
    Show-Usage
    exit 1
}

Write-Host "=== Building Tilt ($Mode mode) ==="
Write-Host "Detected platform: Windows x86_64"
Write-Host "Using Windows build"

if ($Mode -eq "dev") {
    $ImageTag = "tilt-dev-x86"
    $Dockerfile = "Dockerfile.windows"
} else {
    $ImageTag = "tilt-app-x86"
    $Dockerfile = "Dockerfile.windows"
}

if ($Mode -eq "dev") {
    Write-Host "- Frontend will use 'npm run dev' for hot reloading"
    Write-Host "- Python will run with live code reloading"
    Write-Host "- Source code is already included in the image directory"
    
    # Install npm dependencies for development
    Write-Host "Installing npm dependencies for development..."
    Set-Location "..\image\nextjs"
    npm install
    Set-Location "..\..\build"
    
    # Create db_data directory if it doesn't exist
    if (-not (Test-Path "..\db_data")) {
        New-Item -ItemType Directory -Path "..\db_data" | Out-Null
    }
    
    $DevModeArg = "true"
} else {
    Write-Host "- Frontend will be pre-built with 'npm run build'"
    Write-Host "- Python will run with optimized settings"
    Write-Host "- Database will be cleared for fresh start"
    
    # Clear database for production
    Write-Host "Clearing database collections for production..."
    if (Test-Path "..\db_data") {
        Remove-Item "..\db_data" -Recurse -Force
    }
    New-Item -ItemType Directory -Path "..\db_data" | Out-Null
    Write-Host "Database cleared"
    
    # Build Next.js for production
    Write-Host "Building Next.js for production..."
    Set-Location "..\image\nextjs"
    npm install --legacy-peer-deps
    npm run build
    Set-Location "..\..\build"
    
    $DevModeArg = "false"
}

# Build with BuildKit for better caching
Write-Host "Building Docker image ($ImageTag)..."
Set-Location ".."
$env:DOCKER_BUILDKIT = "1"
docker build `
    --target app `
    --tag "$ImageTag`:latest" `
    --file "build\$Dockerfile" `
    --build-arg "DEV_MODE=$DevModeArg" `
    --build-arg "DISPLAY_NUM=1" `
    --build-arg "HEIGHT=768" `
    --build-arg "WIDTH=1024" `
    .
Set-Location "build"

Write-Host "✅ $Mode build completed successfully!"
Write-Host "Image tagged as: $ImageTag`:latest"
if ($Mode -eq "dev") {
    Write-Host "Use '..\run-dev.ps1' to start the development container"
} else {
    Write-Host "Use '..\run-prod.ps1' to start the production container"
}