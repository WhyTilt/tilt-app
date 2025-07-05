#!/bin/bash

set -e

echo "Building Docker image in development mode..."
echo "- Frontend will use 'npm run dev' for hot reloading"
echo "- Python will run with live code reloading"

# Set up symbolic links to repositories for live editing
echo "Setting up repositories for live editing..."

# Clean up any existing directories/symlinks
if [ -L "image/nextjs" ] || [ -d "image/nextjs" ]; then
    echo "Removing existing nextjs..."
    docker run --rm -v $(pwd):/workspace -w /workspace alpine:latest rm -rf image/nextjs
fi
if [ -L "image/agent" ] || [ -d "image/agent" ]; then
    echo "Removing existing agent..."
    docker run --rm -v $(pwd):/workspace -w /workspace alpine:latest rm -rf image/agent
fi

# Clone repositories in parent directory if they don't exist
if [ ! -d "../tilt-frontend" ]; then
    echo "Cloning tilt-frontend..."
    cd .. && git clone https://github.com/WhyTilt/tilt-frontend.git && cd tilt-app
fi
if [ ! -d "../tilt-agent" ]; then
    echo "Cloning tilt-agent..."
    cd .. && git clone https://github.com/WhyTilt/tilt-agent.git && cd tilt-app
fi

# Fix ownership for current user on both repositories
echo "Fixing ownership for live editing..."
sudo chown -R $(whoami):$(whoami) ../tilt-frontend
sudo chown -R $(whoami):$(whoami) ../tilt-agent

# Create symbolic links
echo "Creating symbolic links..."
ln -s ../../tilt-frontend image/nextjs
ln -s ../../tilt-agent image/agent

echo "Symbolic links created - you can now edit code directly in ../tilt-frontend and ../tilt-agent"

# Install npm dependencies for development
echo "Installing npm dependencies for development..."
cd image/nextjs && npm install && cd ../..

# Fix database permissions if needed
if [ -d "./db_data" ] && [ "$(stat -c '%U:%G' ./db_data)" != "$(whoami):$(whoami)" ]; then
    echo "Fixing database directory permissions..."
    sudo chown -R $(whoami):$(whoami) ./db_data
fi

# Build with BuildKit for better caching (from parent directory to include symlinked repos)
DOCKER_BUILDKIT=1 docker build \
    --target app \
    --tag tilt:dev \
    --build-arg DEV_MODE=true \
    --build-arg DISPLAY_NUM=1 \
    --build-arg HEIGHT=768 \
    --build-arg WIDTH=1024 \
    -f Dockerfile \
    ..

echo "Development build completed successfully!"
echo "Use './run-dev.sh' to start the development container"