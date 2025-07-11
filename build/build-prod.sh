#!/bin/bash

set -e

echo "=== Building Tilt (Production Mode) ==="
echo "- Frontend will be pre-built with 'npm run build'"
echo "- Python will run with optimized settings"
echo "- Database will be cleared for fresh start"

# Detect platform and architecture
PLATFORM=$(uname -s)
ARCH=$(uname -m)

echo "Detected platform: $PLATFORM"
echo "Detected architecture: $ARCH"

# Determine Docker image tag and Dockerfile based on platform/arch
case "$PLATFORM" in
    "Linux")
        if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
            IMAGE_TAG="tilt-app-arm64"
            DOCKERFILE="Dockerfile.mac"
            PLATFORM_ARG="--platform linux/arm64"
            echo "Using ARM64 Linux build (similar to Mac Silicon)"
        else
            IMAGE_TAG="tilt-app-nix"
            DOCKERFILE="Dockerfile.linux"
            PLATFORM_ARG=""
            echo "Using x86_64 Linux build"
        fi
        ;;
    "Darwin")
        IMAGE_TAG="tilt-app-arm64"
        DOCKERFILE="Dockerfile.mac"
        PLATFORM_ARG="--platform linux/arm64"
        echo "Using Mac ARM64 build (Apple Silicon)"
        ;;
    *)
        echo "❌ Unsupported platform: $PLATFORM"
        echo "This script supports Linux and macOS only."
        echo "For Windows, use build\\build-prod.bat"
        exit 1
        ;;
esac

# Clear database for production
echo "Clearing database collections for production..."
sudo rm -rf ../db_data
mkdir -p ../db_data
sudo chown -R $(whoami):$(whoami) ../db_data
echo "Database cleared and permissions fixed"

# Set up repositories for production build using submodules
echo "Setting up repositories for production build using submodules..."

# Clean up any existing directories/symlinks
if [ -L "../image/nextjs" ] || [ -d "../image/nextjs" ]; then
    echo "Removing existing nextjs..."
    rm -rf ../image/nextjs
fi
if [ -L "../image/agent" ] || [ -d "../image/agent" ]; then
    echo "Removing existing agent..."
    rm -rf ../image/agent
fi

# Initialize and update submodules for production
echo "Setting up git submodules for production..."

# Remove from git index if they exist
cd .. && git rm --cached image/nextjs 2>/dev/null || true
git rm --cached image/agent 2>/dev/null || true

# Add submodules (force add since they're in .gitignore)
git submodule add -f https://github.com/WhyTilt/tilt-frontend.git image/nextjs || echo "Submodule image/nextjs already exists"
git submodule add -f https://github.com/WhyTilt/tilt-agent.git image/agent || echo "Submodule image/agent already exists"

# Update submodules to latest
git submodule update --init --recursive && cd build

# Build Next.js for production
echo "Building Next.js for production..."
cd ../image/nextjs
npm install --legacy-peer-deps
npm run build
cd ../../build

# Build with BuildKit for better caching
echo "Building Docker image for production ($IMAGE_TAG)..."
cd ../.. && DOCKER_BUILDKIT=1 docker build \
    $PLATFORM_ARG \
    --target app \
    --tag $IMAGE_TAG:latest \
    --file app/$DOCKERFILE \
    --build-arg DEV_MODE=false \
    --build-arg DISPLAY_NUM=1 \
    --build-arg HEIGHT=768 \
    --build-arg WIDTH=1024 \
    . && cd app/build

echo "✅ Production build completed successfully!"
echo "Image tagged as: $IMAGE_TAG:latest"
echo "Use '../run-prod.sh' to start the production container"