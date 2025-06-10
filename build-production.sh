#!/bin/bash

# Production Build Script
# สคริปต์สำหรับ build และ deploy แอปพลิเคชันบน production

set -e  # Exit on any error

echo "🚀 เริ่มต้น Production Build Process..."

# สีสำหรับแสดงผล
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ตั้งค่าตัวแปร
DOCKER_IMAGE_NAME="armboy/vps-first-app"
DOCKER_TAG=$(date +%d%m%y)
BUILD_CONTEXT="."

# เก็บข้อมูลสำหรับ rollback
BACKUP_COMPOSE="docker-compose.yml.backup"
CURRENT_IMAGE=""

echo -e "${BLUE}📋 การตั้งค่า Build:${NC}"
echo "  - Image Name: $DOCKER_IMAGE_NAME"
echo "  - Tag: $DOCKER_TAG"
echo "  - Build Context: $BUILD_CONTEXT"
echo ""

# ฟังก์ชันสำหรับแสดงสถานะ
show_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

show_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

show_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

show_error() {
    echo -e "${RED}❌ $1${NC}"
}

# ตรวจสอบว่า Docker กำลังทำงานหรือไม่
if ! docker info >/dev/null 2>&1; then
    show_error "Docker ไม่ได้ทำงาน กรุณาเริ่มต้น Docker Desktop"
    exit 1
fi

show_success "Docker พร้อมใช้งาน"

# ฟังก์ชัน rollback
rollback_on_failure() {
    show_error "เกิดข้อผิดพลาดในขั้นตอน: $1"
    echo ""
    
    show_status "กำลังทำ rollback..."
    
    # คืนค่า docker-compose.yml เดิม
    if [ -f "$BACKUP_COMPOSE" ]; then
        mv "$BACKUP_COMPOSE" docker-compose.yml
        show_success "คืนค่า docker-compose.yml เรียบร้อยแล้ว"
    fi
    
    # เริ่มต้น services ด้วย image เดิม (ถ้ามี)
    if [ ! -z "$CURRENT_IMAGE" ]; then
        show_status "เริ่มต้น services ด้วย image เดิม..."
        if docker-compose up -d; then
            show_success "Rollback สำเร็จ - กลับไปใช้ image เดิม: $CURRENT_IMAGE"
        else
            show_error "ไม่สามารถ rollback ได้ กรุณาตรวจสอบ manually"
        fi
    else
        show_warning "ไม่พบ image เดิม ไม่สามารถ rollback ได้"
    fi
    
    # แสดงคำแนะนำ
    echo ""
    echo -e "${YELLOW}🔧 วิธีแก้ไขปัญหา:${NC}"
    echo "  1. ตรวจสอบ logs: docker-compose logs -f"
    echo "  2. ตรวจสอบ Dockerfile syntax"
    echo "  3. เช็ค disk space: df -h และ docker system df"
    echo "  4. ลอง build manual: docker build -t test ."
    echo "  5. ตรวจสอบ network: ping docker.io"
    echo ""
    
    exit 1
}

# Trap error และทำ rollback
trap 'rollback_on_failure "Unexpected error"' ERR

# 1. ล้างขยะ Docker ก่อน (เก็บ build cache และ volumes)
show_status "ล้างขยะ Docker (เก็บ build cache และ volumes)..."
DISK_BEFORE=$(docker system df --format "table {{.Type}}\t{{.TotalCount}}\t{{.Size}}")
echo -e "${BLUE}📊 พื้นที่ Docker ก่อนเคลียร์:${NC}"
echo "$DISK_BEFORE"
echo ""

# ล้างเฉพาะ unused containers, networks, images (เก็บ build cache และ volumes)
docker system prune -f
show_success "ล้างขยะเรียบร้อยแล้ว (เก็บ build cache และ volumes ไว้)"

# 2. สำรองข้อมูลเดิมสำหรับ rollback
show_status "สำรองข้อมูลสำหรับ rollback..."

# เก็บ image ปัจจุบัน
CURRENT_IMAGE=$(grep "image: $DOCKER_IMAGE_NAME" docker-compose.yml | head -1 | sed 's/.*image: //' | tr -d ' ')
if [ ! -z "$CURRENT_IMAGE" ]; then
    show_success "เก็บ image เดิม: $CURRENT_IMAGE"
else
    show_warning "ไม่พบ image เดิมใน docker-compose.yml"
fi

# สำรอง docker-compose.yml
cp docker-compose.yml "$BACKUP_COMPOSE"
show_success "สำรอง docker-compose.yml เรียบร้อยแล้ว"

# 3. หยุดการทำงานของ containers ทั้งหมด
show_status "หยุดการทำงานของ Docker containers..."
if docker-compose down --remove-orphans; then
    show_success "หยุด containers เรียบร้อยแล้ว"
else
    show_warning "ไม่มี containers ที่กำลังทำงาน"
fi

# 4. Build Docker image ใหม่ (ใช้ build cache เพื่อความเร็ว)
show_status "เริ่ม build Docker image สำหรับ production..."
echo -e "${YELLOW}⏳ กำลัง build... (ใช้ cache เพื่อความเร็ว)${NC}"

# Pre-build validation
show_status "ตรวจสอบไฟล์ก่อน build..."

if [ ! -f "Dockerfile" ]; then
    rollback_on_failure "ไม่พบ Dockerfile"
fi

if [ ! -f "package.json" ]; then
    rollback_on_failure "ไม่พบ package.json"
fi

# Check disk space
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 85 ]; then
    show_warning "พื้นที่ disk เหลือน้อย ($DISK_USAGE%)"
    echo "ต้องการดำเนินการต่อหรือไม่? (y/N):"
    read -r REPLY
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        rollback_on_failure "ยกเลิกเนื่องจากพื้นที่ disk เหลือน้อย"
    fi
fi

show_success "ไฟล์พร้อมสำหรับ build"

# Build with error handling
if ! docker build \
    --platform linux/amd64 \
    -t "$DOCKER_IMAGE_NAME:$DOCKER_TAG" \
    -t "$DOCKER_IMAGE_NAME:latest" \
    --build-arg NODE_ENV=production \
    "$BUILD_CONTEXT"; then
    rollback_on_failure "Docker build ล้มเหลว"
fi

show_success "Build สำเร็จ! Image: $DOCKER_IMAGE_NAME:$DOCKER_TAG"

# 4. แสดงขนาดของ image
IMAGE_SIZE=$(docker images "$DOCKER_IMAGE_NAME:$DOCKER_TAG" --format "table {{.Size}}" | tail -n 1)
echo -e "${BLUE}📊 ขนาด Docker Image: $IMAGE_SIZE${NC}"

# 5. ทดสอบ image ที่ build แล้ว
show_status "ทดสอบ Docker image..."
if docker run --rm "$DOCKER_IMAGE_NAME:$DOCKER_TAG" node --version >/dev/null 2>&1; then
    show_success "Image ทำงานได้ปกติ"
else
    show_error "Image มีปัญหา!"
    exit 1
fi

# 6. อัปเดต docker-compose.yml ด้วย tag ใหม่
show_status "อัปเดต docker-compose.yml..."
sed -i.bak "s|image: $DOCKER_IMAGE_NAME:.*|image: $DOCKER_IMAGE_NAME:$DOCKER_TAG|g" docker-compose.yml
show_success "อัปเดต docker-compose.yml เรียบร้อยแล้ว"

# 7. เริ่มต้น services ใหม่
show_status "เริ่มต้น production services..."
if ! docker-compose up -d; then
    rollback_on_failure "ไม่สามารถเริ่มต้น services ได้"
fi

show_success "Services เริ่มทำงานเรียบร้อยแล้ว"

# 8. รอให้ services พร้อมใช้งาน
show_status "รอให้ services พร้อมใช้งาน..."
echo -e "${YELLOW}⏳ กำลังตรวจสอบ health check...${NC}"

# รอให้ database พร้อม
timeout=60
counter=0
while [ $counter -lt $timeout ]; do
    if docker-compose ps db | grep -q "healthy"; then
        show_success "Database พร้อมใช้งาน"
        break
    fi
    sleep 2
    counter=$((counter + 2))
    echo -n "."
done

if [ $counter -ge $timeout ]; then
    rollback_on_failure "Database ไม่พร้อมใช้งานภายในเวลาที่กำหนด"
fi

# รอให้ Next.js app พร้อม
timeout=120
counter=0
while [ $counter -lt $timeout ]; do
    if curl -f http://localhost:3000 >/dev/null 2>&1; then
        show_success "Next.js App พร้อมใช้งาน"
        break
    fi
    sleep 3
    counter=$((counter + 3))
    echo -n "."
done

if [ $counter -ge $timeout ]; then
    rollback_on_failure "Next.js App ไม่พร้อมใช้งานภายในเวลาที่กำหนด"  
fi

# 9. แสดงสถานะสุดท้าย
echo ""
echo -e "${GREEN}🎉 Production Build และ Deploy สำเร็จ!${NC}"
echo ""
echo -e "${BLUE}📊 สรุปผลลัพธ์:${NC}"
echo "  • Docker Image: $DOCKER_IMAGE_NAME:$DOCKER_TAG"
echo "  • Image Size: $IMAGE_SIZE"
echo "  • Next.js App: http://localhost:3000"
echo "  • Metabase: http://localhost:3001"
echo "  • Database: localhost:5432"
echo ""

# 10. แสดง containers ที่กำลังทำงาน
echo -e "${BLUE}🐳 Docker Containers Status:${NC}"
docker-compose ps

echo ""
echo -e "${GREEN}✨ Deploy เสร็จสิ้น! แอปพลิเคชันพร้อมใช้งานแล้ว${NC}"

# 11. ตัวเลือกในการ push image ไปยัง registry
echo ""
read -p "ต้องการ push image ไปยัง Docker Hub หรือไม่? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    show_status "กำลัง push image ไปยัง Docker Hub..."
    if docker push "$DOCKER_IMAGE_NAME:$DOCKER_TAG" && docker push "$DOCKER_IMAGE_NAME:latest"; then
        show_success "Push สำเร็จ!"
    else
        show_error "Push ล้มเหลว! ตรวจสอบการเข้าสู่ระบบ Docker Hub"
    fi
fi

# 12. ทำความสะอาดระบบ Docker เพิ่มเติม (เก็บ build cache ไว้)
echo ""
read -p "ต้องการเคลียร์พื้นที่ Docker เพิ่มเติมหรือไม่? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    show_status "กำลังเคลียร์พื้นที่ Docker เพิ่มเติม..."
    
    # แสดงพื้นที่หลัง deploy
    DISK_AFTER_DEPLOY=$(docker system df --format "table {{.Type}}\t{{.TotalCount}}\t{{.Size}}")
    echo -e "${BLUE}📊 พื้นที่ Docker หลัง deploy:${NC}"
    echo "$DISK_AFTER_DEPLOY"
    echo ""
    
    # ล้างเฉพาะขยะ (เก็บ build cache และ volumes ที่ใช้งาน)
    if docker system prune -f; then
        show_success "เคลียร์พื้นที่เพิ่มเติมเรียบร้อยแล้ว"
        
        # แสดงพื้นที่สุดท้าย
        DISK_FINAL=$(docker system df --format "table {{.Type}}\t{{.TotalCount}}\t{{.Size}}")
        echo -e "${BLUE}📊 พื้นที่ Docker สุดท้าย:${NC}"
        echo "$DISK_FINAL"
        echo ""
        
        show_success "ประหยัดพื้นที่เพิ่มเติมสำเร็จ (เก็บ build cache ไว้)"
    else
        show_warning "ไม่สามารถเคลียร์พื้นที่เพิ่มเติมได้"
    fi
else
    show_status "ข้ามการเคลียร์เพิ่มเติม - เก็บ cache ไว้เพื่อความเร็วในรอบถัดไป"
fi

# ล้าง backup files
rm -f "$BACKUP_COMPOSE"

echo ""
echo -e "${BLUE}🔧 คำแนะนำ:${NC}"
echo "  • ตรวจสอบ logs: docker-compose logs -f"
echo "  • หยุด services: docker-compose down"
echo "  • เริ่มใหม่: docker-compose up -d"
echo "  • เช็คพื้นที่ Docker: docker system df"
echo "  • เคลียร์พื้นที่: docker system prune -af"
echo "  • ดู image ทั้งหมด: docker images"
echo "  • ลบ image เก่า: docker rmi <image_name>"
echo "" 