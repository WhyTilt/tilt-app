#!/bin/bash

set -e

# Clear logs directory
rm -rf ./logs/*
mkdir -p ./logs

# Parse command line arguments
DEV_MODE=false
INTERACTIVE_MODE=true

for arg in "$@"; do
    case $arg in
        --dev|dev)
            DEV_MODE=true
            INTERACTIVE_MODE=false
            shift
            ;;
        --prod|prod)
            DEV_MODE=false
            INTERACTIVE_MODE=false
            shift
            ;;
        *)
            # Unknown argument
            ;;
    esac
done

# If no mode specified, prompt user
if [ "$INTERACTIVE_MODE" = "true" ]; then
    echo "Select mode:"
    echo "1) Development mode (--dev)"
    echo "2) Production mode (--prod)"
    read -p "Enter your choice (1 or 2): " choice
    
    case $choice in
        1)
            DEV_MODE=true
            ;;
        2)
            DEV_MODE=false
            ;;
        *)
            echo "Invalid choice. Defaulting to production mode."
            DEV_MODE=false
            ;;
    esac
fi

# Load .env.local file if it exists
if [ -f ".env.local" ]; then
    echo "Loading environment variables from .env.local..."
    export $(grep -v '^#' .env.local | xargs)
fi

# Detect platform and determine which Docker image to use
PLATFORM=$(uname -s)
ARCH=$(uname -m)

if [ "$PLATFORM" = "Darwin" ]; then
    # Mac (Apple Silicon)
    if [ "$DEV_MODE" = "true" ]; then
        IMAGE_NAME="tilt-dev-arm64:latest"
        echo "Starting Tilt in development mode (Mac ARM64)..."
    else
        IMAGE_NAME="tilt-app-arm64:latest"
        echo "Starting Tilt in production mode (Mac ARM64)..."
    fi
else
    # Linux
    if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
        if [ "$DEV_MODE" = "true" ]; then
            IMAGE_NAME="tilt-dev-arm64:latest"
            echo "Starting Tilt in development mode (Linux ARM64)..."
        else
            IMAGE_NAME="tilt-app-arm64:latest"
            echo "Starting Tilt in production mode (Linux ARM64)..."
        fi
    else
        if [ "$DEV_MODE" = "true" ]; then
            IMAGE_NAME="tilt-dev-linux:latest"
            echo "Starting Tilt in development mode (Linux x86_64)..."
        else
            IMAGE_NAME="tilt-app-linux:latest"
            echo "Starting Tilt in production mode (Linux x86_64)..."
        fi
    fi
fi


# Set up Docker environment variables
DOCKER_ENV_VARS="-e DEV_MODE=$DEV_MODE"


# Check if image exists locally, if not pull from Docker Hub
if [ "$DEV_MODE" = "false" ]; then
    if ! docker images -q "$IMAGE_NAME" > /dev/null 2>&1; then
        echo "Production image not found. Pulling from Docker Hub..."
        docker pull "whytilt/$IMAGE_NAME" || {
            echo "❌ Pull failed! Please check your internet connection or build locally with: ./build/build.sh prod"
            exit 1
        }
        # Tag the pulled image with our local name
        docker tag "whytilt/$IMAGE_NAME" "$IMAGE_NAME"
    fi
fi

# Create db_data directory if it doesn't exist
mkdir -p ./db_data

# Stop and remove any existing Tilt containers
echo "Stopping any existing Tilt containers..."
# Stop all containers from tilt images
# Only filter by images that actually exist to avoid docker trying to pull them
for img in tilt-dev-linux tilt-app-linux; do
    if docker images -q "$img" > /dev/null 2>&1; then
        docker ps -q --filter "ancestor=$img" | xargs -r docker stop
        docker ps -aq --filter "ancestor=$img" | xargs -r docker rm
    fi
done
# Also clean up any containers that might be using our ports
docker ps -q | xargs -r -I {} sh -c 'docker port {} 2>/dev/null | grep -q ":3001\|:8000\|:5900\|:6080" && docker stop {} || true'

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
    -v "${CURRENT_DIR}/image":/home/tilt/image \
    -p 5900:5900 \
    -p 3001:3001 \
    -p 6080:6080 \
    -p 8000:8000 \
    -p 27017:27017 \
    "$IMAGE_NAME"

echo ""
echo "Container stopped."