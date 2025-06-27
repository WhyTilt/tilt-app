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
if [ -f "./build.sh" ]; then
    echo "Running build script..."
    ./build.sh $DEV_MODE
elif [ -f "Dockerfile" ]; then
    if [ "$DEV_MODE" = "true" ]; then
        echo "Building Docker image in development mode (skipping Next.js build)..."
        docker build --build-arg DEV_MODE=true -t automator .
    else
        echo "Building Docker image in production mode..."
        docker build --build-arg DEV_MODE=false -t automator .
    fi
fi

# Set up Docker environment variables
DOCKER_ENV_VARS="-e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY -e MONGODB_URI=$MONGODB_URI -e DEV_MODE=$DEV_MODE"


# Create db_data directory if it doesn't exist
mkdir -p ./db_data

docker run \
    $DOCKER_ENV_VARS \
    -v /etc/timezone:/etc/timezone:ro \
    -v /etc/localtime:/etc/localtime:ro \
    -e TZ=$(cat /etc/timezone 2>/dev/null || echo "UTC") \
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
    -v $(pwd)/db_data:/data/db \
    -v $(pwd)/nextjs:/home/computeragent/nextjs \
    -v $(pwd)/agent:/home/computeragent/agent \
    -p 5900:5900 \
    -p 3001:3001 \
    -p 6080:6080 \
    -p 8000:8000 \
    -p 8080:8080 \
    -it automator:latest

echo ""
echo "➡️  Open http://localhost:3001 for automagic"