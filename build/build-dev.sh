#!/bin/bash

set -e

echo "=== Building Tilt (Development Mode) ==="
echo "- Frontend will use 'npm run dev' for hot reloading"
echo "- Python will run with live code reloading"
echo "- Source code will be mounted as volumes"

# Detect platform and architecture
PLATFORM=$(uname -s)
ARCH=$(uname -m)

echo "Detected platform: $PLATFORM"
echo "Detected architecture: $ARCH"

# Determine Docker image tag and Dockerfile based on platform/arch
case "$PLATFORM" in
    "Linux")
        if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
            IMAGE_TAG="tilt-dev-arm64"
            DOCKERFILE="Dockerfile.mac"
            PLATFORM_ARG="--platform linux/arm64"
            echo "Using ARM64 Linux build (similar to Mac Silicon)"
        else
            IMAGE_TAG="tilt-dev-nix"
            DOCKERFILE="Dockerfile.linux"
            PLATFORM_ARG=""
            echo "Using x86_64 Linux build"
        fi
        ;;
    "Darwin")
        IMAGE_TAG="tilt-dev-arm64"
        DOCKERFILE="Dockerfile.mac"
        PLATFORM_ARG="--platform linux/arm64"
        echo "Using Mac ARM64 build (Apple Silicon)"
        ;;
    *)
        echo "❌ Unsupported platform: $PLATFORM"
        echo "This script supports Linux and macOS only."
        echo "For Windows, use build\\build-dev.bat"
        exit 1
        ;;
esac

# Clean up any existing directories/symlinks
if [ -L "../image/nextjs" ] || [ -d "../image/nextjs" ]; then
    echo "Removing existing nextjs..."
    docker run --rm -v $(pwd)/..:/workspace -w /workspace alpine:latest rm -rf image/nextjs
fi
if [ -L "../image/agent" ] || [ -d "../image/agent" ]; then
    echo "Removing existing agent..."
    docker run --rm -v $(pwd)/..:/workspace -w /workspace alpine:latest rm -rf image/agent
fi

# Clone repositories in parent directory if they don't exist
if [ ! -d "../../tilt-frontend" ]; then
    echo "Cloning tilt-frontend..."
    cd ../.. && git clone https://github.com/WhyTilt/tilt-frontend.git && cd app/build
fi
if [ ! -d "../../tilt-agent" ]; then
    echo "Cloning tilt-agent..."
    cd ../.. && git clone https://github.com/WhyTilt/tilt-agent.git && cd app/build
fi

# Fix ownership for current user on both repositories
echo "Fixing ownership for live editing..."
chown -R $(whoami):$(whoami) ../../tilt-frontend
chown -R $(whoami):$(whoami) ../../tilt-agent

# Create symbolic links
echo "Creating symbolic links..."
ln -s ../../../tilt-frontend ../image/nextjs
ln -s ../../../tilt-agent ../image/agent

echo "Symbolic links created - you can now edit code directly in ../../tilt-frontend and ../../tilt-agent"

# Install npm dependencies for development
echo "Installing npm dependencies for development..."
cd ../image/nextjs && npm install && cd ../../build

# Fix database permissions if needed
if [ -d "../db_data" ] && [ "$(stat -c '%U:%G' ../db_data)" != "$(whoami):$(whoami)" ]; then
    echo "Fixing database directory permissions..."
    chown -R $(whoami):$(whoami) ../db_data
fi

# Build with BuildKit for better caching
echo "Building Docker image for development ($IMAGE_TAG)..."
cd ../.. && DOCKER_BUILDKIT=1 docker build \
    $PLATFORM_ARG \
    --target app \
    --tag $IMAGE_TAG:latest \
    --file app/$DOCKERFILE \
    --build-arg DEV_MODE=true \
    --build-arg DISPLAY_NUM=1 \
    --build-arg HEIGHT=768 \
    --build-arg WIDTH=1024 \
    . && cd app/build

echo "✅ Development build completed successfully!"
echo "Image tagged as: $IMAGE_TAG:latest"
echo "Use '../run-dev.sh' to start the development container"