#!/bin/bash

set -e

# Function to show usage
show_usage() {
    echo "Usage: $0 [version]"
    echo ""
    echo "Release script for Tilt - builds and pushes Docker images to DockerHub"
    echo ""
    echo "Arguments:"
    echo "  version   Version tag (e.g., 1.0.0, 1.2.3)"
    echo "            If not provided, will use latest git tag"
    echo ""
    echo "Examples:"
    echo "  $0 1.0.0         # Release specific version"
    echo "  $0               # Release using latest git tag"
    echo ""
    echo "The script will:"
    echo "  1. Detect platform/architecture"
    echo "  2. Build production Docker image"
    echo "  3. Tag with architecture-specific names"
    echo "  4. Push to DockerHub with proper naming convention"
    echo ""
    echo "Image naming convention:"
    echo "  whytilt/tilt-app-linux:VERSION     (x86_64 Linux)"
    echo "  whytilt/tilt-app-arm64:VERSION     (ARM64 Linux/Mac)"
    echo "  whytilt/tilt-app-windows:VERSION   (Windows)"
}

# Parse command line arguments
VERSION=""
if [ $# -eq 0 ]; then
    # Get latest version from git tag and auto-increment
    LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
    if [ -z "$LATEST_TAG" ]; then
        echo "Error: No git tags found and no version specified"
        echo "Please create a git tag or specify a version"
        show_usage
        exit 1
    fi
    
    # Auto-increment patch version
    if [[ "$LATEST_TAG" =~ ^v([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
        MAJOR=${BASH_REMATCH[1]}
        MINOR=${BASH_REMATCH[2]}
        PATCH=${BASH_REMATCH[3]}
        NEW_PATCH=$((PATCH + 1))
        VERSION="${MAJOR}.${MINOR}.${NEW_PATCH}"
        echo "Latest git tag: $LATEST_TAG"
        echo "Auto-incrementing to: $VERSION"
        
        # Create and push the new tag with v prefix for git
        git tag -a "v$VERSION" -m "Release v$VERSION: Auto-incremented patch version"
        git push origin "v$VERSION"
        echo "Created and pushed new tag: v$VERSION"
    else
        echo "Error: Latest tag '$LATEST_TAG' doesn't follow semantic versioning"
        echo "Please use format vX.Y.Z"
        exit 1
    fi
elif [ $# -eq 1 ]; then
    case $1 in
        -h|--help|help) show_usage; exit 0 ;;
        *) VERSION="$1" ;;
    esac
else
    echo "Too many arguments"
    show_usage
    exit 1
fi

# Validate version format
if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Warning: Version '$VERSION' doesn't follow semantic versioning (X.Y.Z)"
    read -p "Continue anyway? [y/N]: " CONTINUE
    if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
        echo "Aborted"
        exit 1
    fi
fi

# Detect platform and architecture
PLATFORM=$(uname -s)
ARCH=$(uname -m)

echo "=== Tilt Release System ==="
echo "Version: $VERSION"
echo "Platform: $PLATFORM"
echo "Architecture: $ARCH"
echo ""

# Determine repository name and dockerfile based on platform/arch
case "$PLATFORM" in
    "Linux")
        if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
            REPO_NAME="whytilt/tilt-app-arm64"
            DOCKERFILE="Dockerfile.mac"
            PLATFORM_ARG="--platform linux/arm64"
            echo "Building ARM64 Linux image"
        else
            REPO_NAME="whytilt/tilt-app-linux"
            DOCKERFILE="Dockerfile.linux"
            PLATFORM_ARG=""
            echo "Building x86_64 Linux image"
        fi
        ;;
    "Darwin")
        REPO_NAME="whytilt/tilt-app-arm64"
        DOCKERFILE="Dockerfile.mac"
        PLATFORM_ARG="--platform linux/arm64"
        echo "Building Mac ARM64 image (Apple Silicon)"
        ;;
    *)
        echo "Error: Unsupported platform: $PLATFORM"
        echo "This script supports Linux and macOS only."
        echo "For Windows, use release.bat"
        exit 1
        ;;
esac

echo "Repository: $REPO_NAME"
echo "Version: $VERSION"
echo ""

# Check if Docker is logged in
if ! docker info >/dev/null 2>&1; then
    echo "Error: Docker is not running or accessible"
    exit 1
fi

# Check DockerHub authentication
if ! docker system info | grep -q "Username:"; then
    echo "Error: Not logged in to DockerHub"
    echo "Please run: docker login"
    echo "Or if you have a token saved:"
    echo "  source .env.local && echo \$DOCKER_TOKEN | docker login -u \$DOCKER_USERNAME --password-stdin"
    exit 1
fi

echo "Docker authentication verified"
echo ""

# Confirm release
echo "About to release:"
echo "  Image: $REPO_NAME:$VERSION"
echo "  Image: $REPO_NAME:latest"
echo ""
read -p "Continue with release? [y/N]: " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "Release cancelled"
    exit 0
fi

# Tag existing built image for release
case "$PLATFORM" in
    "Linux")
        if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
            LOCAL_IMAGE="tilt-app-arm64:latest"
        else
            LOCAL_IMAGE="tilt-app-linux:latest"
        fi
        ;;
    "Darwin")
        LOCAL_IMAGE="tilt-app-arm64:latest"
        ;;
esac

echo "Checking for existing built image: $LOCAL_IMAGE"
if ! docker image inspect "$LOCAL_IMAGE" >/dev/null 2>&1; then
    echo "Error: Image $LOCAL_IMAGE not found!"
    echo "Please run build.sh first to build the image"
    exit 1
fi

echo "Found existing image: $LOCAL_IMAGE"
echo "Tagging for release..."

# Tag the existing image with release tags
docker tag "$LOCAL_IMAGE" "$REPO_NAME:$VERSION"
docker tag "$LOCAL_IMAGE" "$REPO_NAME:latest"

echo "Tagged successfully!"

# Push to DockerHub
echo ""
echo "Pushing to DockerHub..."
echo "- $REPO_NAME:$VERSION"
docker push $REPO_NAME:$VERSION

echo "- $REPO_NAME:latest"
docker push $REPO_NAME:latest

echo ""
echo "Release completed successfully!"
echo ""
echo "Released images:"
echo "  $REPO_NAME:$VERSION"
echo "  $REPO_NAME:latest"
echo ""
echo "You can now run:"
echo "  docker run -p 6080:6080 -p 3001:3001 $REPO_NAME:$VERSION"