#!/bin/bash
set -e

# ---------- CONFIG ----------
IMAGE_NAME="armboy/vps-first-app"
TAG="dev-latest"
DOCKERFILE="Dockerfile.dev"
# ----------------------------

echo "📦 Building Docker multi-platform image:"
echo " - Tag: $IMAGE_NAME:$TAG"
echo " - Using Dockerfile: $DOCKERFILE"

# ตรวจสอบว่ามี buildx builder หรือไม่
if ! docker buildx inspect mybuilder >/dev/null 2>&1; then
  echo "🔧 Creating new Docker buildx builder..."
  docker buildx create --name mybuilder --use
fi

# Build multi-platform image สำหรับทั้ง amd64 (x86_64) และ arm64
echo "🏗️ Building multi-platform image..."
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t $IMAGE_NAME:$TAG \
  -f $DOCKERFILE \
  --push .

echo "✅ Build completed successfully!"
echo "✨ Multi-platform build process finished."
echo "🔖 Image is tagged as: $IMAGE_NAME:$TAG"
echo "📝 To pull and run this image on Linux, use:"
echo "   docker pull $IMAGE_NAME:$TAG"
echo "   docker run -d --name vps-first-app-dev -p 3002:3002 $IMAGE_NAME:$TAG" 