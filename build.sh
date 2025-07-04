#!/bin/bash

set -e

# Check if DEV_MODE is passed as first argument
DEV_MODE=${1:-false}

if [ "$DEV_MODE" = "true" ]; then
    echo "Building Docker image in development mode with optimized layer caching..."
else
    echo "Building Docker image in production mode with optimized layer caching..."
fi

# Check if we should build for multiple platforms
if [ "$2" = "--multi-arch" ]; then
    echo "Building for multiple architectures (amd64, arm64)..."
    # Ensure we're using the multiarch builder
    docker buildx use multiarch
    # Build with buildx for multi-arch (pushes to registry or builds without loading)
    docker buildx build \
        --platform linux/amd64,linux/arm64 \
        --target app \
        --tag tilt \
        --build-arg DEV_MODE=$DEV_MODE \
        --build-arg DISPLAY_NUM=1 \
        --build-arg HEIGHT=768 \
        --build-arg WIDTH=1024 \
        .
else
    echo "Building for current platform only..."
    # Build with BuildKit for better caching (single platform)
    DOCKER_BUILDKIT=1 docker build \
        --target app \
        --tag tilt \
        --build-arg DEV_MODE=$DEV_MODE \
        --build-arg DISPLAY_NUM=1 \
        --build-arg HEIGHT=768 \
        --build-arg WIDTH=1024 \
        .
fi

echo "Build completed successfully!"