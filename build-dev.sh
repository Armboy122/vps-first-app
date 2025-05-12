#!/bin/bash
set -e

# ---------- CONFIG ----------
IMAGE_NAME="armboy/vps-first-app"
DATE_TAG="dev-$(date +%Y%m%d)"
CACHE_FROM="$IMAGE_NAME:dev"
PLATFORMS="linux/amd64"
DOCKERFILE="Dockerfile.dev"
# ----------------------------

echo "📦 Building Docker image for development with Bun (Fastest Build):"
echo " - Target Platform: $PLATFORMS"
echo " - Tags: $IMAGE_NAME:$DATE_TAG, $IMAGE_NAME:dev"
echo " - Using Dockerfile: $DOCKERFILE"

# ตรวจสอบว่ามี buildx builder หรือไม่
if ! docker buildx inspect mybuilder >/dev/null 2>&1; then
  echo "🔧 Creating new Docker buildx builder..."
  docker buildx create --name mybuilder --use
fi

# ไม่ต้องดึง cache เพื่อความเร็วสูงสุดในครั้งแรก
# echo "🔄 Attempting to pull latest image for cache..."
# docker pull $CACHE_FROM || echo "⚠️ No cache image found or platform mismatch. Building from scratch."

# Build ด้วย buildx และ push (จะใช้ cache จาก registry ถ้ามีและตรงกัน)
echo "🏗️ Building and pushing image with Bun..."
docker buildx build \
  --platform $PLATFORMS \
  --cache-from type=registry,ref=$CACHE_FROM \
  --build-arg BUILDKIT_INLINE_CACHE=1 \
  -t $IMAGE_NAME:$DATE_TAG \
  -f $DOCKERFILE \
  --push .

echo "✅ Build and push completed successfully!"

# ลบ image ที่สร้างบน local หลังจาก push เสร็จ
echo "🧹 Cleaning up local images..."
docker image rm $IMAGE_NAME:$DATE_TAG || echo "ℹ️ Image $IMAGE_NAME:$DATE_TAG not found locally or already removed."
docker image rm $IMAGE_NAME:dev || echo "ℹ️ Image $IMAGE_NAME:dev not found locally or already removed."

echo "✨ Development build process finished."