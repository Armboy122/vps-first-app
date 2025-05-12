#!/bin/bash
set -e

# ---------- CONFIG ----------
IMAGE_NAME="armboy/vps-first-app"
DATE_TAG="prod-$(date +%Y%m%d)"
LATEST_TAG="latest"
CACHE_FROM="$IMAGE_NAME:latest"
PLATFORMS="linux/amd64,linux/arm64"
DOCKERFILE="Dockerfile.prod"
# ----------------------------

echo "📦 Building Docker image for production with Yarn (Stable):"
echo " - Target Platforms: $PLATFORMS"
echo " - Tags: $IMAGE_NAME:$DATE_TAG, $IMAGE_NAME:$LATEST_TAG"
echo " - Using Dockerfile: $DOCKERFILE"

# ตรวจสอบว่ามี buildx builder หรือไม่
if ! docker buildx inspect mybuilder >/dev/null 2>&1; then
  echo "🔧 Creating new Docker buildx builder..."
  docker buildx create --name mybuilder --use
fi

# พยายามดึง cache จาก registry
echo "🔄 Attempting to pull latest image for cache..."
docker pull $CACHE_FROM || echo "⚠️ No cache image found or platform mismatch. Building from scratch."

# Build ด้วย buildx และ push
echo "🏗️ Building and pushing production image with Yarn..."
docker buildx build \
  --platform $PLATFORMS \
  --cache-from type=registry,ref=$CACHE_FROM \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  -t $IMAGE_NAME:$DATE_TAG \
  -t $IMAGE_NAME:$LATEST_TAG \
  -f $DOCKERFILE \
  --push .

echo "✅ Build and push completed successfully!"

# ลบ image ที่สร้างบน local หลังจาก push เสร็จ
echo "🧹 Cleaning up local images..."
docker image rm $IMAGE_NAME:$DATE_TAG || echo "ℹ️ Image $IMAGE_NAME:$DATE_TAG not found locally or already removed."
docker image rm $IMAGE_NAME:$LATEST_TAG || echo "ℹ️ Image $IMAGE_NAME:$LATEST_TAG not found locally or already removed."

echo "✨ Production build process finished. Image available at:"
echo " - $IMAGE_NAME:$DATE_TAG"
echo " - $IMAGE_NAME:$LATEST_TAG" 