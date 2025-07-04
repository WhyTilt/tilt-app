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

# Determine which image to use
IMAGE_NAME="tilt:latest"

if [ "$DEV_MODE" = "true" ]; then
    echo "Development mode: building locally..."
    if [ -f "./build.sh" ]; then
        echo "Running build script..."
        ./build.sh $DEV_MODE
    elif [ -f "Dockerfile" ]; then
        echo "Building Docker image in development mode (skipping Next.js build)..."
        docker build --build-arg DEV_MODE=true -t tilt .
    fi
else
    echo "Production mode: trying to pull from Docker Hub..."
    if docker pull whytilt/tilt:latest 2>/dev/null; then
        echo "✅ Using Docker Hub image: whytilt/tilt:latest"
        IMAGE_NAME="whytilt/tilt:latest"
    else
        echo "❌ Failed to pull from Docker Hub, building locally..."
        if [ -f "./build.sh" ]; then
            echo "Running build script..."
            ./build.sh $DEV_MODE
        elif [ -f "Dockerfile" ]; then
            echo "Building Docker image in production mode..."
            docker build --build-arg DEV_MODE=false -t tilt .
        fi
    fi
fi

# Set up Docker environment variables
DOCKER_ENV_VARS="-e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY -e DEV_MODE=$DEV_MODE"


# Create db_data directory if it doesn't exist
mkdir -p ./db_data

docker run \
    $DOCKER_ENV_VARS \
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
    -v $(pwd)/nextjs:/home/tilt/nextjs \
    -v $(pwd)/agent:/home/tilt/agent \
    -v $(pwd)/image:/home/tilt/image \
    -p 5900:5900 \
    -p 3001:3001 \
    -p 6080:6080 \
    -p 8000:8000 \
    -it $IMAGE_NAME

echo ""
echo "➡️  Open http://localhost:3001 for Tilt"