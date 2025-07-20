# Run script for Tilt on Windows PowerShell

# Error handling
$ErrorActionPreference = "Stop"

# Parse command line arguments
$DevMode = $args[0] -eq "dev"

# Clear logs directory
if (Test-Path "logs") {
    Remove-Item -Path "logs\*" -Recurse -Force
}
New-Item -ItemType Directory -Path "logs" -Force | Out-Null

if ($DevMode) {
    Write-Host "Starting Tilt in development mode..."
} else {
    Write-Host "Starting Tilt in production mode..."
}

# Load .env.local file if it exists
if (Test-Path ".env.local") {
    Write-Host "Loading environment variables from .env.local..."
    Get-Content ".env.local" | Where-Object { $_ -notmatch '^#' -and $_ -match '=' } | ForEach-Object {
        $parts = $_ -split '=', 2
        if ($parts.Length -eq 2) {
            [Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim())
        }
    }
}

if ($DevMode) {
    $IMAGE_NAME = "tilt-dev-windows:latest"
} else {
    $IMAGE_NAME = "tilt-app-windows:latest"
}

# Create db_data directory if it doesn't exist
if (!(Test-Path "db_data")) {
    New-Item -ItemType Directory -Path "db_data" | Out-Null
}

# Stop and remove any existing Tilt containers
Write-Host "Stopping any existing Tilt containers..."
# Stop all containers from tilt images
$containers = docker ps -q --filter "ancestor=tilt-app-windows" --filter "ancestor=tilt-dev-windows"
if ($containers) {
    docker stop $containers
    docker rm $containers
}
# Also clean up any containers that might be using our ports
$allContainers = docker ps -q
foreach ($container in $allContainers) {
    $ports = docker port $container 2>$null
    if ($ports -and ($ports -match ":3001|:8000|:5900|:6080")) {
        docker stop $container 2>$null
    }
}

# Get current directory for volume mounts
$CURRENT_DIR = (Get-Location).Path

# Check if image exists
$imageExists = docker images -q "$IMAGE_NAME" 2>$null
if (-not $imageExists) {
    if ($DevMode) {
        Write-Host "Development image not found. Building..."
        & ".\build.ps1" "dev"
    } else {
        Write-Host "Production image not found. Pulling from Docker Hub..."
        docker pull "whytilt/$IMAGE_NAME"
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Pull failed! Falling back to local build..."
            & ".\build.ps1"
        } else {
            # Tag the pulled image with our local name
            docker tag "whytilt/$IMAGE_NAME" "$IMAGE_NAME"
        }
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Setup failed!"
        exit $LASTEXITCODE
    }
}

if ($DevMode) {
    Write-Host "Starting development container..."
    Write-Host "- Frontend: Local source with hot reloading"
    Write-Host "- Backend: Production configuration"
} else {
    Write-Host "Starting production container..."
    Write-Host "- Frontend: Pre-built and optimized"
    Write-Host "- Backend: Production configuration"
}

# Build docker command with conditional volume mount
$dockerArgs = @(
    "run"
    "-e", "DEV_MODE=$($DevMode.ToString().ToLower())"
    "-v", "$CURRENT_DIR\user_data:/home/tilt/user_data"
    "-v", "$CURRENT_DIR\user_data\.mozilla:/home/tilt/.mozilla"
    "-v", "$CURRENT_DIR\user_data\.config\gtk-3.0:/home/tilt/.config/gtk-3.0"
    "-v", "$CURRENT_DIR\user_data\.config\gtk-2.0:/home/tilt/.config/gtk-2.0"
    "-v", "$CURRENT_DIR\user_data\.config\libreoffice:/home/tilt/.config/libreoffice"
    "-v", "$CURRENT_DIR\user_data\.config\pulse:/home/tilt/.config/pulse"
    "-v", "$CURRENT_DIR\user_data\.local:/home/tilt/.local"
    "-v", "$CURRENT_DIR\user_data\.cache:/home/tilt/.cache"
    "-v", "$CURRENT_DIR\user_data\Desktop:/home/tilt/Desktop"
    "-v", "$CURRENT_DIR\user_data\Documents:/home/tilt/Documents"
    "-v", "$CURRENT_DIR\user_data\Downloads:/home/tilt/Downloads"
    "-v", "$CURRENT_DIR\logs:/home/tilt/logs"
    "-v", "$CURRENT_DIR\db_data:/data/db"
    "-v", "$CURRENT_DIR\image:/home/tilt/image"
)

# Add dev mode volume mounts - separate mount for nextjs for better file watching
if ($DevMode) {
    $dockerArgs += "-v", "$CURRENT_DIR\image\nextjs:/home/tilt/nextjs-dev"
}

$dockerArgs += @(
    "-p", "5900:5900"
    "-p", "3001:3001"
    "-p", "6080:6080"
    "-p", "8000:8000"
    "-p", "27017:27017"
    "-it", "$IMAGE_NAME"
)

docker @dockerArgs

Write-Host ""
if ($DevMode) {
    Write-Host "➡️  Development server started!"
} else {
    Write-Host "➡️  Production server started!"
}
Write-Host "➡️  Frontend: http://localhost:3001"
Write-Host "➡️  Backend API: http://localhost:8000"
Write-Host "➡️  VNC Web: http://localhost:6080"
Write-Host ""
Write-Host "Container stopped."