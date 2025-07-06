#!/bin/bash

set -e

# Clear logs directory
rm -rf ./logs/*
mkdir -p ./logs

# Parse command line arguments
DEV_MODE=false
for arg in "$@"; do
    case $arg in
        --dev)
            DEV_MODE=true
            shift
            ;;
        *)
            # Unknown argument
            ;;
    esac
done

# Load .env.local file if it exists
if [ -f ".env.local" ]; then
    echo "Loading environment variables from .env.local..."
    export $(grep -v '^#' .env.local | xargs)
fi

# Build if needed (check if Dockerfile is newer than any existing image)
if [ "$DEV_MODE" = "true" ]; then
    echo "Development mode: Building Docker image without pre-building Next.js..."
    if [ -f "./build.sh" ]; then
        ./build.sh $DEV_MODE
    else
        docker build --build-arg DEV_MODE=true -t tilt .
    fi
else
    echo "Production mode: Building apps and copying files to ./image/ BEFORE container build"
    
    # Build Next.js for production FIRST
    echo "Building Next.js for production..."
    cd nextjs
    # Clean and fix permissions for .next directory
    rm -rf .next || true
    mkdir -p .next
    chmod -R 755 .next 2>/dev/null || true
    npm run build
    cd ..
    
    # Copy all files to ./image/ directory
    echo "Copying all files to ./image/ directory..."
    
    # Copy agent directory (built Python app)
    cp -r agent/ image/
    
    # Copy nextjs directory (built Next.js app with .next folder)
    cp -r nextjs/ image/
    
    # Copy other necessary files
    cp pyproject.toml image/ 2>/dev/null || true
    cp ruff.toml image/ 2>/dev/null || true
    cp CLAUDE.md image/ 2>/dev/null || true
    cp README.md image/ 2>/dev/null || true
    cp LICENSE image/ 2>/dev/null || true
    
    echo "Pre-built apps copied to ./image/ successfully!"
    
    # Build Docker image with pre-built apps
    if [ -f "./build.sh" ]; then
        ./build.sh $DEV_MODE
    else
        docker build --build-arg DEV_MODE=false -t tilt .
    fi
fi

# Set up Docker environment variables
DOCKER_ENV_VARS="-e DEV_MODE=$DEV_MODE"


# Create db_data directory if it doesn't exist
mkdir -p ./db_data

# Get absolute path for cross-platform compatibility
# Use realpath if available (Linux/WSL), otherwise use pwd (macOS/basic systems)
if command -v realpath > /dev/null 2>&1; then
    CURRENT_DIR="$(realpath .)"
else
    CURRENT_DIR="$(pwd)"
fi

docker run \
    $DOCKER_ENV_VARS \
    -v /etc/timezone:/etc/timezone:ro \
    -v /etc/localtime:/etc/localtime:ro \
    -e TZ=$(cat /etc/timezone 2>/dev/null || echo "UTC") \
    -v $HOME/.anthropic:/home/tilt/.anthropic \
    -v "${CURRENT_DIR}/user_data":/home/tilt/user_data \
    -v "${CURRENT_DIR}/user_data/.mozilla":/home/tilt/.mozilla \
    -v "${CURRENT_DIR}/user_data/.config/gtk-3.0":/home/tilt/.config/gtk-3.0 \
    -v "${CURRENT_DIR}/user_data/.config/gtk-2.0":/home/tilt/.config/gtk-2.0 \
    -v "${CURRENT_DIR}/user_data/.config/libreoffice":/home/tilt/.config/libreoffice \
    -v "${CURRENT_DIR}/user_data/.config/pulse":/home/tilt/.config/pulse \
    -v "${CURRENT_DIR}/user_data/.local":/home/tilt/.local \
    -v "${CURRENT_DIR}/user_data/.cache":/home/tilt/.cache \
    -v "${CURRENT_DIR}/user_data/Desktop":/home/tilt/Desktop \
    -v "${CURRENT_DIR}/user_data/Documents":/home/tilt/Documents \
    -v "${CURRENT_DIR}/user_data/Downloads":/home/tilt/Downloads \
    -v "${CURRENT_DIR}/logs":/home/tilt/logs \
    -v "${CURRENT_DIR}/db_data":/data/db \
    -v "${CURRENT_DIR}/nextjs":/home/tilt/nextjs \
    -v "${CURRENT_DIR}/agent":/home/tilt/agent \
    -v "${CURRENT_DIR}/image":/home/tilt/image \
    -p 5900:5900 \
    -p 3001:3001 \
    -p 6080:6080 \
    -p 8000:8000 \
    -p 27017:27017 \
    -it tilt:latest

echo ""
echo "➡️  Open http://localhost:3001 for Tilt"