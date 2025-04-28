#!/bin/bash
set -e

# สีที่ใช้ในการแสดงผล
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function สำหรับแสดงข้อความ
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ตั้งค่าวันที่สำหรับใช้เป็นแท็ก
TAG_DATE=$(date +%d%m%y)

# ชื่อ image
IMAGE_NAME="armboy/vps-first-app:$TAG_DATE"

log_info "เริ่มการ build image สำหรับหลาย platforms เวลา: $(date)"

# ตรวจสอบว่ามี Docker และ BuildKit
if ! command -v docker &> /dev/null; then
    log_error "ไม่พบ Docker โปรดติดตั้งก่อน"
    exit 1
fi

# สร้าง builder ถ้ายังไม่มี
if ! docker buildx inspect mybuilder &> /dev/null; then
    log_info "กำลังสร้าง buildx builder..."
    docker buildx create --name mybuilder --use
else
    log_info "ใช้ builder ที่มีอยู่แล้ว"
    docker buildx use mybuilder
fi

# ตรวจสอบการ login Docker Hub
docker info | grep 'Username' > /dev/null
if [ $? -ne 0 ]; then
    log_warn "คุณยังไม่ได้ login Docker Hub กรุณา login ก่อน"
    docker login
fi

# Build และ push image
log_info "กำลัง build และ push image $IMAGE_NAME สำหรับ linux/amd64 และ linux/arm64..."
docker buildx build --platform linux/amd64,linux/arm64 -t $IMAGE_NAME --push .

if [ $? -eq 0 ]; then
    log_info "Build และ push สำเร็จ!"
    log_info "Image ใหม่: $IMAGE_NAME"
    
    # แก้ไข docker-compose.yml
    log_info "กำลังแก้ไข docker-compose.yml เพื่อใช้ image ใหม่..."
    if [ "$(uname)" == "Darwin" ]; then
        # สำหรับ macOS
        sed -i '' "s|image: armboy/vps-first-app:.*|image: $IMAGE_NAME|g" docker-compose.yml
    else
        # สำหรับ Linux
        sed -i "s|image: armboy/vps-first-app:.*|image: $IMAGE_NAME|g" docker-compose.yml
    fi
    
    # แก้ไข deploy.sh
    log_info "กำลังแก้ไข deploy.sh เพื่อใช้ image ใหม่..."
    if [ "$(uname)" == "Darwin" ]; then
        # สำหรับ macOS
        sed -i '' "s|sudo docker pull armboy/vps-first-app:.*|sudo docker pull $IMAGE_NAME || { log_error \"ไม่สามารถดึง image ได้\"; exit 1; }|g" deploy.sh
    else
        # สำหรับ Linux
        sed -i "s|sudo docker pull armboy/vps-first-app:.*|sudo docker pull $IMAGE_NAME || { log_error \"ไม่สามารถดึง image ได้\"; exit 1; }|g" deploy.sh
    fi
    
    log_info "เสร็จสิ้น! คุณสามารถ commit และ push การเปลี่ยนแปลงไปยัง GitHub แล้ว run deploy.sh บน server"
else
    log_error "เกิดข้อผิดพลาดในการ build หรือ push"
fi 