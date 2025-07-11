#!/bin/bash

set -e

echo "=== Running Tilt (Production Mode) ==="

# Detect platform and architecture
PLATFORM=$(uname -s)
ARCH=$(uname -m)

echo "Detected platform: $PLATFORM"
echo "Detected architecture: $ARCH"

# Determine Docker image tag based on platform/arch
case "$PLATFORM" in
    "Linux")
        if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
            IMAGE_TAG="tilt-app-arm64"
            echo "Using ARM64 Linux image"
        else
            IMAGE_TAG="tilt-app-nix"
            echo "Using x86_64 Linux image"
        fi
        ;;
    "Darwin")
        IMAGE_TAG="tilt-app-arm64"
        echo "Using Mac ARM64 image (Apple Silicon)"
        ;;
    *)
        echo "❌ Unsupported platform: $PLATFORM"
        echo "This script supports Linux and macOS only."
        echo "For Windows, use run-prod.bat"
        exit 1
        ;;
esac

# Stop any existing containers using port 3001
echo "Checking for existing containers on port 3001..."
EXISTING_CONTAINER=$(docker ps --filter "publish=3001" --format "{{.ID}}" | head -n 1)
if [ ! -z "$EXISTING_CONTAINER" ]; then
    echo "Stopping existing container using port 3001: $EXISTING_CONTAINER"
    docker stop $EXISTING_CONTAINER
    echo "Container stopped"
fi

# Clear logs directory
rm -rf ./logs/*
mkdir -p ./logs

# Load .env.local file if it exists
if [ -f ".env.local" ]; then
    echo "Loading environment variables from .env.local..."
    export $(grep -v '^#' .env.local | xargs)
fi

# Check if prod image exists
if [[ "$(docker images -q $IMAGE_TAG:latest 2> /dev/null)" == "" ]]; then
    echo "Production image not found. Building..."
    ./build/build-prod.sh
fi

# Create necessary directories
mkdir -p ./db_data

echo "Starting production container ($IMAGE_TAG)..."
echo "- Frontend: Pre-built and optimized"
echo "- Backend: Production configuration"

docker run \
    -e DEV_MODE=false \
    -v /etc/timezone:/etc/timezone:ro \
    -v /etc/localtime:/etc/localtime:ro \
    -e TZ=$(cat /etc/timezone 2>/dev/null || echo "UTC") \
    -v $HOME/.anthropic:/home/tilt/.anthropic \
    -v $(pwd)/user_data:/home/tilt/user_data \
    -v $(pwd)/user_data/.mozilla:/home/tilt/.mozilla \
    -v $(pwd)/user_data/.config/gtk-3.0:/home/tilt/.config/gtk-3.0 \
    -v $(pwd)/user_data/.config/gtk-2.0:/home/tilt/.config/gtk-2.0 \
    -v $(pwd)/user_data/.config/libreoffice:/home/tilt/.config/libreoffice \
    -v $(pwd)/user_data/.config/pulse:/home/tilt/.config/pulse \
    -v $(pwd)/user_data/.local:/home/tilt/.local \
    -v $(pwd)/user_data/.cache:/home/tilt/.cache \
    -v $(pwd)/user_data/Desktop:/home/tilt/Desktop \
    -v $(pwd)/user_data/Documents:/home/tilt/Documents \
    -v $(pwd)/user_data/Downloads:/home/tilt/Downloads \
    -v $(pwd)/logs:/home/tilt/logs \
    -v $(pwd)/db_data:/data/db \
    -p 5900:5900 \
    -p 3001:3001 \
    -p 6080:6080 \
    -p 8000:8000 \
    -p 27017:27017 \
    -it $IMAGE_TAG:latest

echo ""
echo "➡️  Production server started!"
echo "➡️  Frontend: http://localhost:3001"
echo "➡️  Backend API: http://localhost:8000"
echo "➡️  VNC Web: http://localhost:6080"