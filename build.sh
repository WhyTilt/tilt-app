#!/bin/bash

set -e

# Check if DEV_MODE is passed as first argument
DEV_MODE=${1:-false}

if [ "$DEV_MODE" = "true" ]; then
    echo "Building Docker image in development mode with optimized layer caching..."
else
    echo "Building Docker image in production mode with optimized layer caching..."
fi

# Build with BuildKit for better caching
DOCKER_BUILDKIT=1 docker build \
    --target app \
    --tag tilt \
    --build-arg DEV_MODE=$DEV_MODE \
    --build-arg DISPLAY_NUM=1 \
    --build-arg HEIGHT=768 \
    --build-arg WIDTH=1024 \
    .

echo "Build completed successfully!"