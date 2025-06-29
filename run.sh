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

# Check if image exists and determine if rebuild is needed
IMAGE_EXISTS=$(docker images -q tilt:latest 2>/dev/null)
FORCE_REBUILD=false

# Check if we need to rebuild based on mode change
if [ -n "$IMAGE_EXISTS" ]; then
    # Check the DEV_MODE label of existing image to see if mode changed
    EXISTING_DEV_MODE=$(docker inspect tilt:latest --format='{{index .Config.Labels "dev_mode"}}' 2>/dev/null || echo "unknown")
    if [ "$EXISTING_DEV_MODE" != "$DEV_MODE" ]; then
        echo "Mode changed from $EXISTING_DEV_MODE to $DEV_MODE, forcing rebuild..."
        FORCE_REBUILD=true
    fi
else
    echo "No existing image found, building new image..."
    FORCE_REBUILD=true
fi

# Build if needed
if [ "$FORCE_REBUILD" = "true" ] || [ ! -n "$IMAGE_EXISTS" ]; then
    if [ -f "./build.sh" ]; then
        echo "Running build script..."
        ./build.sh $DEV_MODE
    elif [ -f "Dockerfile" ]; then
        if [ "$DEV_MODE" = "true" ]; then
            echo "Building Docker image in development mode (skipping Next.js build)..."
            docker build --build-arg DEV_MODE=true --label dev_mode=true -t tilt .
        else
            echo "Building Docker image in production mode..."
            docker build --build-arg DEV_MODE=false --label dev_mode=false -t tilt .
        fi
    fi
else
    echo "Using existing Docker image (mode: $EXISTING_DEV_MODE)"
fi

# Set up Docker environment variables
DOCKER_ENV_VARS="-e DEV_MODE=$DEV_MODE"


# Create db_data directory if it doesn't exist
mkdir -p ./db_data

# Set up volume mounts based on dev mode
VOLUME_MOUNTS="-v /etc/timezone:/etc/timezone:ro \
-v /etc/localtime:/etc/localtime:ro \
-v $HOME/.anthropic:/home/computeragent/.anthropic \
-v $(pwd)/user_data:/home/computeragent/user_data \
-v $(pwd)/user_data/.mozilla:/home/computeragent/.mozilla \
-v $(pwd)/user_data/.config/gtk-3.0:/home/computeragent/.config/gtk-3.0 \
-v $(pwd)/user_data/.config/gtk-2.0:/home/computeragent/.config/gtk-2.0 \
-v $(pwd)/user_data/.config/libreoffice:/home/computeragent/.config/libreoffice \
-v $(pwd)/user_data/.config/pulse:/home/computeragent/.config/pulse \
-v $(pwd)/user_data/.local:/home/computeragent/.local \
-v $(pwd)/user_data/.cache:/home/computeragent/.cache \
-v $(pwd)/user_data/Desktop:/home/computeragent/Desktop \
-v $(pwd)/user_data/Documents:/home/computeragent/Documents \
-v $(pwd)/user_data/Downloads:/home/computeragent/Downloads \
-v $(pwd)/logs:/home/computeragent/logs \
-v $(pwd)/db_data:/data/db"

# In dev mode, mount source code for live editing
# In production mode, use the built code inside the container
if [ "$DEV_MODE" = "true" ]; then
    VOLUME_MOUNTS="$VOLUME_MOUNTS -v $(pwd)/nextjs:/home/computeragent/nextjs -v $(pwd)/agent:/home/computeragent/agent"
fi

docker run \
    $DOCKER_ENV_VARS \
    -e TZ=$(cat /etc/timezone 2>/dev/null || echo "UTC") \
    $VOLUME_MOUNTS \
    -p 5900:5900 \
    -p 3001:3001 \
    -p 6080:6080 \
    -p 8000:8000 \
    -p 8080:8080 \
    -it tilt:latest

echo ""
echo "➡️  Open http://localhost:3001 for Tilt"