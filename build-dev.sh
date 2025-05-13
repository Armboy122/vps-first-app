#!/bin/bash
set -e

# ---------- CONFIG ----------
IMAGE_NAME="armboy/vps-first-app"
TAG="dev-latest"
DOCKERFILE="Dockerfile.dev"
# ----------------------------

echo "📦 Building Docker image for development with Bun (Fastest Build):"
echo " - Tag: $IMAGE_NAME:$TAG"
echo " - Using Dockerfile: $DOCKERFILE"

# Build locally without push (เร็วกว่ามาก)
echo "🏗️ Building development image with Bun (local only)..."
docker build \
  -t $IMAGE_NAME:$TAG \
  -f $DOCKERFILE \
  .

echo "✅ Build completed successfully!"
echo "✨ Development build process finished."
echo "🔖 Image is tagged as: $IMAGE_NAME:$TAG"
echo "📝 To run this image, use: docker run -d --name vps-first-app-dev -p 3002:3002 $IMAGE_NAME:$TAG"