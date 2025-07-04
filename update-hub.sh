#!/bin/bash
set -e

# Tilt Docker Hub Deployment Script
# Usage: ./deploy.sh [version]

VERSION=${1:-latest}
IMAGE_NAME="whytilt/tilt"

echo "🚀 Deploying Tilt to Docker Hub"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Load environment variables
if [ -f ".env.local" ]; then
    echo "📋 Loading environment variables..."
    export $(grep -v '^#' .env.local | xargs)
fi

# Check Docker Hub token
if [ -z "$DOCKER_HUB_TOKEN" ]; then
    echo "❌ DOCKER_HUB_TOKEN not found in .env.local"
    echo "   Add your Docker Hub token to .env.local:"
    echo "   DOCKER_HUB_TOKEN=dckr_pat_..."
    exit 1
fi

# Login to Docker Hub
echo "🔐 Logging into Docker Hub..."
echo "$DOCKER_HUB_TOKEN" | docker login -u whytilt --password-stdin

# Ensure we're using the multiarch builder
echo "🏗️  Setting up multi-architecture builder..."
docker buildx use multiarch 2>/dev/null || {
    echo "Creating multiarch builder..."
    docker buildx create --use --name multiarch --driver docker-container
}

# Build and push multi-architecture image
echo "📦 Building and pushing multi-arch image..."
echo "   Platforms: linux/amd64, linux/arm64"
echo "   Image: $IMAGE_NAME:$VERSION"

if [ "$VERSION" = "latest" ]; then
    # Push both latest and current date tag
    DATE_TAG=$(date +%Y%m%d)
    docker buildx build \
        --platform linux/amd64,linux/arm64 \
        --tag "$IMAGE_NAME:latest" \
        --tag "$IMAGE_NAME:$DATE_TAG" \
        --push \
        .
    echo "✅ Pushed: $IMAGE_NAME:latest"
    echo "✅ Pushed: $IMAGE_NAME:$DATE_TAG"
else
    # Push specific version
    docker buildx build \
        --platform linux/amd64,linux/arm64 \
        --tag "$IMAGE_NAME:$VERSION" \
        --push \
        .
    echo "✅ Pushed: $IMAGE_NAME:$VERSION"
fi

# Verify the push
echo "🔍 Verifying deployment..."
docker manifest inspect "$IMAGE_NAME:$VERSION" > /dev/null && {
    echo "✅ Image verified on Docker Hub"
} || {
    echo "❌ Failed to verify image on Docker Hub"
    exit 1
}

echo ""
echo "🎉 Deployment completed successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 Users can now install with:"
echo "   curl -sSL install.whytilt.com | bash"
echo ""
echo "🏷️  Available tags:"
echo "   docker pull $IMAGE_NAME:$VERSION"
if [ "$VERSION" = "latest" ]; then
    echo "   docker pull $IMAGE_NAME:$DATE_TAG"
fi
echo ""