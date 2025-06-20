#!/bin/bash
# 🚀 UAT Build & Deploy Script - Optimized for Speed

set -e  # Exit on error

# Config
DATE_TAG=$(date +%Y%m%d-%H%M)
IMAGE_NAME="armboy/vps-first-app-uat"

echo "🔸 Building UAT: $DATE_TAG"

# Pull for cache, build with enhanced caching
echo "📦 Using registry cache..."
docker pull $IMAGE_NAME:latest 2>/dev/null || echo "No cache found"

DOCKER_BUILDKIT=1 docker build \
    -f Dockerfile.uat \
    --cache-from $IMAGE_NAME:latest \
    --build-arg BUILDKIT_INLINE_CACHE=1 \
    -t $IMAGE_NAME:$DATE_TAG \
    -t $IMAGE_NAME:latest \
    . && echo "✅ Build OK" || { echo "❌ Build failed"; exit 1; }

# Push to registry
echo "🚀 Pushing..."
docker push $IMAGE_NAME:$DATE_TAG && docker push $IMAGE_NAME:latest || { echo "❌ Push failed"; exit 1; }

# Deploy container
echo "🔄 Deploying..."
docker stop nextjs-app-uat 2>/dev/null || true
docker rm nextjs-app-uat 2>/dev/null || true

docker run -d --name nextjs-app-uat -p 3002:3000 --network vps-first-app_mynetwork \
    -e DATABASE_URL="postgresql://sa:1234@db:5432/PeaTransformer?schema=public" \
    -e NEXTAUTH_SECRET="armoby122-uat" \
    -e NEXTAUTH_URL="https://test.peas3.shop" \
    --restart unless-stopped $IMAGE_NAME:$DATE_TAG || { echo "❌ Deploy failed"; exit 1; }

echo "✅ UAT running: https://test.peas3.shop"

# Safe cleanup (preserve cache)
echo "🧹 Cleanup..."
docker image prune -f
docker container prune -f  
docker network prune -f
docker volume prune -f

echo "🎉 Done! Tag: $DATE_TAG"