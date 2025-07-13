# Release script for Tilt on Windows PowerShell

param(
    [Parameter(Position=0)]
    [string]$Version = ""
)

# Error handling
$ErrorActionPreference = "Stop"

# Function to show usage
function Show-Usage {
    Write-Host "Usage: .\release.ps1 [version]"
    Write-Host ""
    Write-Host "Release script for Tilt - builds and pushes Docker images to DockerHub"
    Write-Host ""
    Write-Host "Arguments:"
    Write-Host "  version   Version tag (e.g., v0.0.63, v0.0.64)"
    Write-Host "            If not provided, will use latest git tag"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\release.ps1 v0.0.64    # Release specific version"
    Write-Host "  .\release.ps1            # Release using latest git tag"
    Write-Host ""
    Write-Host "The script will:"
    Write-Host "  1. Build Windows production Docker image"
    Write-Host "  2. Tag with Windows-specific names"
    Write-Host "  3. Push to DockerHub as whytilt/tilt-app-windows:VERSION"
}

# Parse command line arguments
if ([string]::IsNullOrEmpty($Version)) {
    # Get latest version from git tag and auto-increment
    $LATEST_TAG = git describe --tags --abbrev=0 2>$null
    if ([string]::IsNullOrEmpty($LATEST_TAG)) {
        Write-Host "❌ No git tags found and no version specified"
        Write-Host "Please create a git tag or specify a version"
        Show-Usage
        exit 1
    }
    
    # Auto-increment patch version for v0.0.x format
    if ($LATEST_TAG -match '^v(\d+)\.(\d+)\.(\d+)$') {
        $MAJOR = [int]$Matches[1]
        $MINOR = [int]$Matches[2]
        $PATCH = [int]$Matches[3]
        $NEW_PATCH = $PATCH + 1
        $Version = "v$MAJOR.$MINOR.$NEW_PATCH"
        Write-Host "Latest git tag: $LATEST_TAG"
        Write-Host "Auto-incrementing to: $Version"
        
        # Create and push the new tag
        git tag -a "$Version" -m "Release $Version`: Auto-incremented patch version"
        git push origin "$Version"
        Write-Host "✅ Created and pushed new tag: $Version"
    } else {
        Write-Host "❌ Latest tag '$LATEST_TAG' doesn't follow semantic versioning"
        Write-Host "Please use format vX.Y.Z"
        exit 1
    }
} elseif ($Version -eq "-h" -or $Version -eq "--help" -or $Version -eq "help") {
    Show-Usage
    exit 0
}

# Validate version format
if ($Version -notmatch '^v\d+\.\d+\.\d+$') {
    Write-Host "⚠️  Warning: Version '$Version' doesn't follow semantic versioning (vX.Y.Z)"
    $CONTINUE = Read-Host "Continue anyway? [y/N]"
    if ($CONTINUE -ne "y" -and $CONTINUE -ne "Y") {
        Write-Host "Aborted"
        exit 1
    }
}

Write-Host "=== Tilt Release System ==="
Write-Host "Version: $Version"
Write-Host "Platform: Windows"
Write-Host ""

$REPO_NAME = "whytilt/tilt-app-windows"
$LOCAL_IMAGE = "tilt-app-windows:latest"

Write-Host "Repository: $REPO_NAME"
Write-Host "Version: $Version"
Write-Host ""

# Check if Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Host "❌ Docker is not running or accessible"
    exit 1
}

# Check DockerHub authentication
$dockerInfo = docker system info 2>$null | Out-String
if (-not $dockerInfo.Contains("Username:")) {
    Write-Host "❌ Not logged in to DockerHub"
    Write-Host "Please run: docker login"
    Write-Host "Or if you have a token saved in .env.local:"
    Write-Host "  Load environment variables and use: docker login -u `$DOCKER_USERNAME --password-stdin"
    exit 1
}

Write-Host "✅ Docker authentication verified"
Write-Host ""

# Confirm release
Write-Host "About to release:"
Write-Host "  Image: $REPO_NAME`:$Version"
Write-Host "  Image: $REPO_NAME`:latest"
Write-Host ""
$CONFIRM = Read-Host "Continue with release? [y/N]"
if ($CONFIRM -ne "y" -and $CONFIRM -ne "Y") {
    Write-Host "Release cancelled"
    exit 0
}

# Check for existing built image
Write-Host "Checking for existing built image: $LOCAL_IMAGE"
$imageExists = docker image inspect "$LOCAL_IMAGE" 2>$null
if (-not $imageExists) {
    Write-Host "❌ Image $LOCAL_IMAGE not found!"
    Write-Host "Building image first..."
    & ".\build.ps1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed!"
        exit 1
    }
}

Write-Host "✅ Found existing image: $LOCAL_IMAGE"
Write-Host "Tagging for release..."

# Tag the existing image with release tags
docker tag "$LOCAL_IMAGE" "$REPO_NAME`:$Version"
docker tag "$LOCAL_IMAGE" "$REPO_NAME`:latest"

Write-Host "✅ Tagged successfully!"

# Push to DockerHub
Write-Host ""
Write-Host "Pushing to DockerHub..."
Write-Host "- $REPO_NAME`:$Version"
docker push "$REPO_NAME`:$Version"

Write-Host "- $REPO_NAME`:latest"  
docker push "$REPO_NAME`:latest"

Write-Host ""
Write-Host "✅ Release completed successfully!"
Write-Host ""
Write-Host "Released images:"
Write-Host "  🐳 $REPO_NAME`:$Version"
Write-Host "  🐳 $REPO_NAME`:latest"
Write-Host ""
Write-Host "You can now run:"
Write-Host "  docker run -p 6080:6080 -p 3001:3001 $REPO_NAME`:$Version"