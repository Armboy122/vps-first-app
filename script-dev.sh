#!/bin/bash

# Pull the latest image
docker pull armboy/vps-first-app:dev-latest

# Stop and remove existing container if it exists
docker stop vps-app 2>/dev/null
docker rm vps-app 2>/dev/null

# Run the container
docker run -d \
  --name vps-app \
  --network app-network \
  -p 3002:3002 \
  -e DATABASE_URL="postgresql://sa:1234@db:5432/PeaTransformer?schema=public" \
  -e NODE_ENV=production \
  -e PORT=3002 \
  -e VIRTUAL_HOST=dev.peas3.shop \
  -e NEXTAUTH_URL="https://dev.peas3.shop" \
  -e NEXTAUTH_SECRET="armoby122" \
  -e NEXT_PUBLIC_GENERATE_PDF="https://script.google.com/macros/s/AKfycbzMlQp7F8jI9v3nN1PSkV_laJ8BY66vLAheexB120jO5o7n8O8X0otZlHGCenOESvN61Q/exec" \
  armboy/vps-first-app:dev-latest 

  # Clean up unused Docker data
docker system prune -af --volumes