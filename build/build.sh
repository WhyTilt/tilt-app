#!/bin/bash

set -e

# Function to show usage
show_usage() {
    echo "Usage: $0 [dev|prod]"
    echo ""
    echo "Build modes:"
    echo "  dev   - Development build (npm run dev, hot reload)"
    echo "  prod  - Production build (npm run build, optimized)"
    echo ""
    echo "Examples:"
    echo "  $0 dev    # Build for development"
    echo "  $0 prod   # Build for production"
    echo "  $0        # Interactive prompt"
}

# Parse command line arguments
MODE=""
if [ $# -eq 0 ]; then
    # Interactive mode - prompt user
    echo "=== Tilt Build System ==="
    echo "Choose build mode:"
    echo "  1) Development (hot reload, npm run dev)"
    echo "  2) Production (optimized, npm run build)"
    echo ""
    read -p "Enter choice [1-2]: " choice
    case $choice in
        1) MODE="dev" ;;
        2) MODE="prod" ;;
        *) echo "Invalid choice. Exiting."; exit 1 ;;
    esac
elif [ $# -eq 1 ]; then
    case $1 in
        dev|development) MODE="dev" ;;
        prod|production) MODE="prod" ;;
        -h|--help|help) show_usage; exit 0 ;;
        *) echo "Invalid mode: $1"; show_usage; exit 1 ;;
    esac
else
    echo "Too many arguments"
    show_usage
    exit 1
fi

# Detect platform and architecture
PLATFORM=$(uname -s)
ARCH=$(uname -m)

echo "=== Building Tilt ($MODE mode) ==="
echo "Detected platform: $PLATFORM"
echo "Detected architecture: $ARCH"

# Determine image tag and dockerfile based on platform/arch and mode
case "$PLATFORM" in
    "Linux")
        if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
            if [ "$MODE" = "dev" ]; then
                IMAGE_TAG="tilt-dev-arm64"
            else
                IMAGE_TAG="tilt-app-arm64"
            fi
            DOCKERFILE="Dockerfile.mac"
            PLATFORM_ARG="--platform linux/arm64"
            echo "Using ARM64 Linux build"
        else
            if [ "$MODE" = "dev" ]; then
                IMAGE_TAG="tilt-dev-nix"
            else
                IMAGE_TAG="tilt-app-nix"
            fi
            DOCKERFILE="Dockerfile.linux"
            PLATFORM_ARG=""
            echo "Using x86_64 Linux build"
        fi
        ;;
    "Darwin")
        if [ "$MODE" = "dev" ]; then
            IMAGE_TAG="tilt-dev-arm64"
        else
            IMAGE_TAG="tilt-app-arm64"
        fi
        DOCKERFILE="Dockerfile.mac"
        PLATFORM_ARG="--platform linux/arm64"
        echo "Using Mac ARM64 build (Apple Silicon)"
        ;;
    *)
        echo "❌ Unsupported platform: $PLATFORM"
        echo "This script supports Linux and macOS only."
        echo "For Windows, use build.bat $MODE"
        exit 1
        ;;
esac

if [ "$MODE" = "dev" ]; then
    echo "- Frontend will use 'npm run dev' for hot reloading"
    echo "- Python will run with live code reloading"
    echo "- Source code will be mounted as volumes"
    
    # Set up repositories for development using submodules (preserve tracking)
    echo "Setting up repositories for development using submodules..."
    
    # Initialize and update submodules if they don't exist
    if [ ! -d "image/nextjs/.git" ] || [ ! -d "image/agent/.git" ]; then
        echo "Initializing submodules for development..."
        
        # Remove from git index if they exist as regular directories
        git rm --cached image/nextjs 2>/dev/null || true
        git rm --cached image/agent 2>/dev/null || true
        
        # Remove existing directories/symlinks
        rm -rf image/nextjs image/agent 2>/dev/null || true
        
        # Add submodules
        git submodule add -f git@github.com:WhyTilt/tilt-frontend.git image/nextjs || echo "Submodule image/nextjs already exists"
        git submodule add -f git@github.com:WhyTilt/tilt-agent.git image/agent || echo "Submodule image/agent already exists"
        
        # Update submodules to latest
        git submodule update --init --recursive
    else
        echo "Submodules already exist - updating to latest..."
        git submodule update --remote --recursive
    fi
    
    # Install npm dependencies for development
    echo "Installing npm dependencies for development..."
    (cd image/nextjs && npm install)
    
    # Database directory should be ready
    mkdir -p db_data
    
    DEV_MODE_ARG="true"
else
    echo "- Frontend will be pre-built with 'npm run build'"
    echo "- Python will run with optimized settings"
    echo "- Database will be cleared for fresh start"
    
    # Clear database for production
    echo "Clearing database collections for production..."
    if [ -d "db_data" ]; then
        # Try to remove with regular permissions first
        rm -rf db_data 2>/dev/null || {
            echo "Note: Some database files may have restricted permissions - they will be overwritten on next run"
        }
    fi
    mkdir -p db_data
    echo "Database cleared"
    
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
    
    # Check if repositories exist in parent directory first
    if [ -d "../tilt-frontend" ] && [ -d "../tilt-agent" ]; then
        echo "Using existing repositories from parent directory..."
        # Copy repositories to image directory
        cp -r ../tilt-frontend image/nextjs
        cp -r ../tilt-agent image/agent
    else
        # Initialize and update submodules for production
        echo "Setting up git submodules for production..."
        
        # Remove from git index if they exist
        git rm --cached image/nextjs 2>/dev/null || true
        git rm --cached image/agent 2>/dev/null || true
        
        # Add submodules (force add since they're in .gitignore)
        git submodule add -f git@github.com:WhyTilt/tilt-frontend.git image/nextjs || echo "Submodule image/nextjs already exists"
        git submodule add -f git@github.com:WhyTilt/tilt-agent.git image/agent || echo "Submodule image/agent already exists"
        
        # Update submodules to latest
        git submodule update --init --recursive
    fi
    
    # Build Next.js for production
    echo "Building Next.js for production..."
    (cd image/nextjs && npm install --legacy-peer-deps && npm run build)
    
    DEV_MODE_ARG="false"
fi

# Build with BuildKit for better caching
echo "Building Docker image ($IMAGE_TAG)..."
DOCKER_BUILDKIT=1 docker build \
    $PLATFORM_ARG \
    --target app \
    --tag $IMAGE_TAG:latest \
    --file build/$DOCKERFILE \
    --build-arg DEV_MODE=$DEV_MODE_ARG \
    --build-arg DISPLAY_NUM=1 \
    --build-arg HEIGHT=768 \
    --build-arg WIDTH=1024 \
    .

echo "✅ $MODE build completed successfully!"
echo "Image tagged as: $IMAGE_TAG:latest"
if [ "$MODE" = "dev" ]; then
    echo "Use '../run-dev.sh' to start the development container"
else
    echo "Use '../run-prod.sh' to start the production container"
fi