#!/bin/bash

set -e

echo "Building Docker image with optimized layer caching..."

# Build with BuildKit for better caching
DOCKER_BUILDKIT=1 docker build \
    --target app \
    --tag automator \
    --build-arg DISPLAY_NUM=1 \
    --build-arg HEIGHT=768 \
    --build-arg WIDTH=1024 \
    .

echo "Build completed successfully!"