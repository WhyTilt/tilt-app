#!/bin/bash

set -e

echo "Building Docker image in production mode..."
echo "- Frontend will be pre-built and optimized"
echo "- Python will run with optimized settings"

# Set up repositories for production build
echo "Setting up repositories for production build..."

# Clean up any existing directories/symlinks
if [ -L "image/nextjs" ] || [ -d "image/nextjs" ]; then
    echo "Removing existing nextjs..."
    rm -rf image/nextjs
fi
if [ -L "image/agent" ] || [ -d "image/agent" ]; then
    echo "Removing existing agent..."
    rm -rf image/agent
fi

# For production, clone fresh copies to avoid any dev artifacts
echo "Cloning fresh copies for production..."
git clone https://github.com/WhyTilt/tilt-frontend.git image/nextjs
git clone https://github.com/WhyTilt/tilt-agent.git image/agent

# Build Next.js for production in the submodule
echo "Building Next.js for production..."
cd image/nextjs
npm install --legacy-peer-deps
npm run build
cd ../..

# Build with BuildKit for better caching
DOCKER_BUILDKIT=1 docker build \
    --target app \
    --tag tilt:prod \
    --build-arg DEV_MODE=false \
    --build-arg DISPLAY_NUM=1 \
    --build-arg HEIGHT=768 \
    --build-arg WIDTH=1024 \
    .

echo "Production build completed successfully!"
echo "Use './run-prod.sh' to start the production container"