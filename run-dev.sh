#!/bin/bash

set -e

echo "Starting Tilt in development mode..."
echo "- Frontend: npm run dev (hot reloading)"
echo "- Backend: Python with live reloading"

# Clear logs directory
rm -rf ./logs/*
mkdir -p ./logs

# Load .env.local file if it exists
if [ -f ".env.local" ]; then
    echo "Loading environment variables from .env.local..."
    export $(grep -v '^#' .env.local | xargs)
fi

# Check if dev image exists
if [[ "$(docker images -q tilt:dev 2> /dev/null)" == "" ]]; then
    echo "Development image not found. Building..."
    ./build-dev.sh
fi

# Set up Docker environment variables
DOCKER_ENV_VARS="-e DEV_MODE=true"

# Create necessary directories
mkdir -p ./db_data

echo "Starting development container..."
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
    -v $(pwd)/../tilt-frontend:/home/tilt/nextjs \
    -v $(pwd)/../tilt-agent:/home/tilt/agent \
    -v $(pwd)/image:/home/tilt/image \
    -p 5900:5900 \
    -p 3001:3001 \
    -p 6080:6080 \
    -p 8000:8000 \
    -it tilt:dev

echo ""
echo "➡️  Development server started!"
echo "➡️  Frontend: http://localhost:3001"
echo "➡️  Backend API: http://localhost:8000"
echo "➡️  VNC Web: http://localhost:6080"