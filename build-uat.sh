#!/bin/bash

# 🚀 Simple UAT Build & Deploy Script
# Create date tag
DATE_TAG=$(date +%Y%m%d-%H%M)
IMAGE_NAME="armboy/vps-first-app-uat"

echo "🔸 Building UAT image with tag: $DATE_TAG"

# Build UAT image with date tag and latest (with BuildKit cache)
if DOCKER_BUILDKIT=1 docker build -f Dockerfile.uat -t $IMAGE_NAME:$DATE_TAG -t $IMAGE_NAME:latest .; then
    echo "✅ Build สำเร็จ"
    
    # Push both tags to DockerHub
    echo "🔸 Pushing to DockerHub..."
    if docker push $IMAGE_NAME:$DATE_TAG && docker push $IMAGE_NAME:latest; then
        echo "✅ Push สำเร็จ - Tags: $DATE_TAG, latest"
    else
        echo "❌ Push ไม่ได้"
        exit 1
    fi
else
    echo "❌ Build ไม่ได้"
    exit 1
fi

# Stop & remove old container
echo "🔸 Stopping old UAT container..."
docker stop nextjs-app-uat 2>/dev/null || true
docker rm nextjs-app-uat 2>/dev/null || true

# Run new container on port 3002 using date tag
echo "🔸 Starting UAT container on port 3002..."
if docker run -d --name nextjs-app-uat -p 3002:3000 --network vps-first-app_mynetwork \
    -e DATABASE_URL="postgresql://sa:1234@db:5432/PeaTransformer?schema=public" \
    -e NEXTAUTH_SECRET="armoby122-uat" \
    -e NEXTAUTH_URL="https://test.peas3.shop" \
    --restart unless-stopped $IMAGE_NAME:$DATE_TAG; then
    echo "✅ UAT container running at https://test.peas3.shop"
    echo "📝 Image tag: $DATE_TAG"
else
    echo "❌ ไม่สามารถเริ่ม container ได้"
    exit 1
fi

echo "🎉 UAT deployment เสร็จสิ้น!" 