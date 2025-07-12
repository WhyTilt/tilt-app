# Tilt Runner - PowerShell
param(
    [Parameter(Position=0)]
    [ValidateSet("dev", "development", "prod", "production", "help", "-h", "--help")]
    [string]$Mode = "prod"
)

# Function to show usage
function Show-Usage {
    Write-Host "Usage: .\run.ps1 [dev|prod]"
    Write-Host ""
    Write-Host "Run modes:"
    Write-Host "  dev   - Development mode (npm run dev, hot reload)"
    Write-Host "  prod  - Production mode (optimized, default)"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\run.ps1 dev    # Run in development mode"
    Write-Host "  .\run.ps1 prod   # Run in production mode"
    Write-Host "  .\run.ps1        # Run in production mode (default)"
}

# Handle help
if ($Mode -in @("help", "-h", "--help")) {
    Show-Usage
    exit 0
}

# Normalize mode
if ($Mode -in @("development")) { $Mode = "dev" }
if ($Mode -in @("production")) { $Mode = "prod" }

if ($Mode -notin @("dev", "prod")) {
    Write-Host "Invalid mode: $Mode"
    Show-Usage
    exit 1
}

Write-Host "=== Running Tilt ($Mode Mode) ==="
Write-Host "Detected platform: Windows x86_64"
Write-Host "Using Windows $Mode image"

$ImageTag = "whytilt/tilt-app-windows"

# Stop any existing containers using port 3001
Write-Host "Checking for existing containers on port 3001..."
$ExistingContainers = docker ps --filter "publish=3001" --format "{{.ID}}"
if ($ExistingContainers) {
    foreach ($Container in $ExistingContainers) {
        Write-Host "Stopping existing container using port 3001: $Container"
        docker stop $Container
        Write-Host "Container stopped"
    }
}

# Clear logs directory
if (Test-Path "logs") {
    Remove-Item "logs" -Recurse -Force
}
New-Item -ItemType Directory -Path "logs" | Out-Null

# Load .env.local file if it exists
if (Test-Path ".env.local") {
    Write-Host "Loading environment variables from .env.local..."
    Get-Content ".env.local" | ForEach-Object {
        if ($_ -notmatch "^#" -and $_ -match "=") {
            $name, $value = $_ -split "=", 2
            Set-Item -Path "env:$name" -Value $value
        }
    }
}

# Pull latest image from Docker Hub
Write-Host "Pulling latest Tilt image from Docker Hub..."
docker pull "$ImageTag`:latest"

# Create db_data directory if it doesn't exist
if (-not (Test-Path "db_data")) {
    New-Item -ItemType Directory -Path "db_data" | Out-Null
}

# Fix MongoDB permissions on Windows (preserves data, fixes ownership)
Write-Host "Fixing MongoDB database permissions..."
docker run --rm `
    -v "${PWD}\db_data:/data/db" `
    "$ImageTag`:latest" `
    bash -c "chown -R mongodb:mongodb /data/db && chmod -R 755 /data/db"

Write-Host "Starting $Mode container ($ImageTag)..."
if ($Mode -eq "dev") {
    Write-Host "- Frontend: npm run dev (hot reloading)"
    Write-Host "- Backend: Python with live reloading"
    $DevModeArg = "true"
} else {
    Write-Host "- Frontend: Pre-built and optimized"
    Write-Host "- Backend: Production configuration"
    $DevModeArg = "false"
}

docker run `
    -e "DEV_MODE=$DevModeArg" `
    -v "${PWD}\user_data:/home/tilt/user_data" `
    -v "${PWD}\user_data\.mozilla:/home/tilt/.mozilla" `
    -v "${PWD}\user_data\.config\gtk-3.0:/home/tilt/.config/gtk-3.0" `
    -v "${PWD}\user_data\.config\gtk-2.0:/home/tilt/.config/gtk-2.0" `
    -v "${PWD}\user_data\.config\libreoffice:/home/tilt/.config/libreoffice" `
    -v "${PWD}\user_data\.config\pulse:/home/tilt/.config/pulse" `
    -v "${PWD}\user_data\.local:/home/tilt/.local" `
    -v "${PWD}\user_data\.cache:/home/tilt/.cache" `
    -v "${PWD}\user_data\Desktop:/home/tilt/Desktop" `
    -v "${PWD}\user_data\Documents:/home/tilt/Documents" `
    -v "${PWD}\user_data\Downloads:/home/tilt/Downloads" `
    -v "${PWD}\logs:/home/tilt/logs" `
    -v "${PWD}\db_data:/data/db" `
    -v "${PWD}\image:/home/tilt/image" `
    -p 5900:5900 `
    -p 3001:3001 `
    -p 6080:6080 `
    -p 8000:8000 `
    -p 27017:27017 `
    -it "$ImageTag`:latest"

Write-Host ""
Write-Host "➡️  $Mode server started!"
Write-Host "➡️  Frontend: http://localhost:3001"
Write-Host "➡️  Backend API: http://localhost:8000"
Write-Host "➡️  VNC Web: http://localhost:6080"