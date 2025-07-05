#!/bin/bash

set -e

echo "Building Docker image in production mode..."
echo "- Frontend will be pre-built and optimized"
echo "- Python will run with optimized settings"
echo "- Database will be cleared for fresh start"

# Clear database for production
echo "Clearing database collections for production..."
sudo rm -rf ./db_data
mkdir -p ./db_data
sudo chown -R $(whoami):$(whoami) ./db_data
echo "Database cleared and permissions fixed"

# Set up repositories for production build using submodules
echo "Setting up repositories for production build using submodules..."

# Clean up any existing directories/symlinks
if [ -L "image/nextjs" ] || [ -d "image/nextjs" ]; then
    echo "Removing existing nextjs..."
    rm -rf image/nextjs
fi
if [ -L "image/agent" ] || [ -d "image/agent" ]; then
    echo "Removing existing agent..."
    rm -rf image/agent
fi

# Initialize and update submodules for production
echo "Setting up git submodules for production..."

# Remove from git index if they exist
git rm --cached image/nextjs 2>/dev/null || true
git rm --cached image/agent 2>/dev/null || true

# Add submodules (force add since they're in .gitignore)
git submodule add -f https://github.com/WhyTilt/tilt-frontend.git image/nextjs || echo "Submodule image/nextjs already exists"
git submodule add -f https://github.com/WhyTilt/tilt-agent.git image/agent || echo "Submodule image/agent already exists"

# Update submodules to latest
git submodule update --init --recursive

# Build Next.js for production
echo "Building Next.js for production..."
cd image/nextjs
npm install --legacy-peer-deps
npm run build
cd ../..

# Build with BuildKit for better caching (from parent directory to include tilt-app path)
DOCKER_BUILDKIT=1 docker build \
    --target app \
    --tag tilt:prod \
    --build-arg DEV_MODE=false \
    --build-arg DISPLAY_NUM=1 \
    --build-arg HEIGHT=768 \
    --build-arg WIDTH=1024 \
    -f Dockerfile \
    ..

echo "Production build completed successfully!"
echo "Use './run-prod.sh' to start the production container"