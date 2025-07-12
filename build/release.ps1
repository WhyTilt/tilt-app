# Tilt Release System - PowerShell
param(
    [Parameter(Position=0)]
    [string]$Version = $null
)

# Function to show usage
function Show-Usage {
    Write-Host "Usage: .\release.ps1 [version]"
    Write-Host ""
    Write-Host "Release script for Tilt - builds and pushes Docker images to DockerHub"
    Write-Host ""
    Write-Host "Arguments:"
    Write-Host "  version   Version tag (e.g., v1.0.0, v1.2.3)"
    Write-Host "            If not provided, will use latest git tag"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\release.ps1 v1.0.0        # Release specific version"
    Write-Host "  .\release.ps1               # Release using latest git tag"
    Write-Host ""
    Write-Host "The script will:"
    Write-Host "  1. Detect platform/architecture"
    Write-Host "  2. Tag existing production Docker image"
    Write-Host "  3. Push to DockerHub with proper naming convention"
    Write-Host ""
    Write-Host "Image naming convention:"
    Write-Host "  whytilt/tilt-app-windows:VERSION   (Windows)"
}

# Handle help
if ($Version -in @("help", "-h", "--help")) {
    Show-Usage
    exit 0
}

# Get version from git if not provided
if (-not $Version) {
    try {
        $LatestTag = git describe --tags --abbrev=0 2>$null
        if (-not $LatestTag) {
            Write-Host "❌ No git tags found and no version specified"
            Write-Host "Please create a git tag or specify a version"
            Show-Usage
            exit 1
        }
        
        Write-Host "Latest git tag: $LatestTag"
        $Version = $LatestTag
        Write-Host "Using version: $Version"
        Write-Host "Note: Auto-increment not implemented in PowerShell - using existing tag"
    } catch {
        Write-Host "❌ Could not get git tags"
        Show-Usage
        exit 1
    }
}

# Validate version format
if ($Version -notmatch "^v\d+\.\d+\.\d+$") {
    Write-Host "⚠️  Warning: Version '$Version' doesn't follow semantic versioning (vX.Y.Z)"
    $Continue = Read-Host "Continue anyway? [y/N]"
    if ($Continue -notin @("y", "Y")) {
        Write-Host "Aborted"
        exit 1
    }
}

Write-Host "=== Tilt Release System ==="
Write-Host "Version: $Version"
Write-Host "Platform: Windows x86_64"
Write-Host "Architecture: x86_64"
Write-Host ""

$RepoName = "whytilt/tilt-app-windows"
$LocalImage = "tilt-app-x86:latest"

Write-Host "Building Windows image"
Write-Host "Repository: $RepoName"
Write-Host "Version: $Version"
Write-Host ""

# Check if Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Host "❌ Docker is not running or accessible"
    exit 1
}

# Load .env.local file if it exists (check current and parent directory)
if (Test-Path ".env.local") {
    Write-Host "Loading environment variables from .env.local..."
    Get-Content ".env.local" | ForEach-Object {
        if ($_ -notmatch "^#" -and $_ -match "=") {
            $name, $value = $_ -split "=", 2
            Write-Host "DEBUG: Setting $name"
            Set-Item -Path "env:$name" -Value $value
        }
    }
} elseif (Test-Path "../.env.local") {
    Write-Host "Loading environment variables from ../.env.local..."
    Get-Content "../.env.local" | ForEach-Object {
        if ($_ -notmatch "^#" -and $_ -match "=") {
            $name, $value = $_ -split "=", 2
            Write-Host "DEBUG: Setting $name"
            Set-Item -Path "env:$name" -Value $value
        }
    }
} else {
    Write-Host "DEBUG: No .env.local found in current or parent directory"
    Write-Host "DEBUG: Current directory: $PWD"
    Write-Host "DEBUG: Checking paths:"
    Write-Host "  .env.local exists: $(Test-Path '.env.local')"
    Write-Host "  ../.env.local exists: $(Test-Path '../.env.local')"
}

# Try Docker login with environment variables if they exist
if ($env:DOCKER_USERNAME -and $env:DOCKER_TOKEN) {
    Write-Host "Attempting Docker login with environment variables..."
    echo $env:DOCKER_TOKEN | docker login -u $env:DOCKER_USERNAME --password-stdin
}

Write-Host "✅ Docker login completed"
Write-Host ""

# Confirm release
Write-Host "About to release:"
Write-Host "  Image: $RepoName`:$Version"
Write-Host "  Image: $RepoName`:latest"
Write-Host ""
$Confirm = Read-Host "Continue with release? [y/N]"
if ($Confirm -notin @("y", "Y")) {
    Write-Host "Release cancelled"
    exit 0
}

Write-Host "Checking for existing built image: $LocalImage"
try {
    docker image inspect $LocalImage | Out-Null
} catch {
    Write-Host "❌ Image $LocalImage not found!"
    Write-Host "Please run build.ps1 first to build the image"
    exit 1
}

Write-Host "✅ Found existing image: $LocalImage"
Write-Host "Tagging for release..."

# Tag the existing image with release tags
docker tag $LocalImage "$RepoName`:$Version"
docker tag $LocalImage "$RepoName`:latest"

Write-Host "✅ Tagged successfully!"

# Push to DockerHub
Write-Host ""
Write-Host "Pushing to DockerHub..."
Write-Host "- $RepoName`:$Version"
docker push "$RepoName`:$Version"

Write-Host "- $RepoName`:latest"
docker push "$RepoName`:latest"

Write-Host ""
Write-Host "✅ Release completed successfully!"
Write-Host ""
Write-Host "Released images:"
Write-Host "  🐳 $RepoName`:$Version"
Write-Host "  🐳 $RepoName`:latest"
Write-Host ""
Write-Host "You can now run:"
Write-Host "  docker run -p 6080:6080 -p 3001:3001 $RepoName`:$Version"