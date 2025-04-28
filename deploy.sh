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

# แสดงเวลาเริ่มต้น
START_TIME=$(date +%s)
log_info "เริ่มการ deploy เวลา: $(date)"

# ตรวจสอบว่าอยู่ในไดเรกทอรีที่ถูกต้อง
CURRENT_DIR=$(pwd)
log_info "ทำงานในไดเรกทอรี: $CURRENT_DIR"

# บันทึกสถานะของ volume
log_info "ตรวจสอบ PostgreSQL volume..."
PG_VOLUME=$(sudo docker volume ls -q | grep postgresql_pgdata)
if [ -z "$PG_VOLUME" ]; then
    log_warn "ไม่พบ PostgreSQL volume!"
else
    log_info "พบ PostgreSQL volume: $PG_VOLUME"
fi

# ดึง code ล่าสุดจาก GitHub
log_info "กำลังดึง code ล่าสุดจาก repository..."
git pull

# เปิดใช้งาน BuildKit
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# สำรองข้อมูลก่อน deploy (ถ้าต้องการ)
# log_info "กำลังสำรองข้อมูล PostgreSQL..."
# BACKUP_DIR="$CURRENT_DIR/backups"
# mkdir -p $BACKUP_DIR
# BACKUP_FILE="$BACKUP_DIR/db_backup_$(date +%Y%m%d_%H%M%S).sql"
# sudo docker exec db pg_dump -U sa PeaTransformer > $BACKUP_FILE || log_warn "ไม่สามารถสำรองข้อมูลได้ แต่จะดำเนินการต่อ"

# ตรวจสอบและหยุด containers ที่กำลังทำงาน
log_info "กำลังหยุด containers ที่กำลังทำงาน..."
sudo docker compose down || log_warn "ไม่สามารถหยุด containers ได้ อาจจะยังไม่มี containers กำลังทำงาน"

# ล้าง container และ images ที่ไม่ได้ใช้ ยกเว้น volumes
log_info "กำลังล้าง containers และ images ที่ไม่ได้ใช้..."
sudo docker container prune -f
sudo docker image prune -f

# Build images ใหม่
log_info "กำลัง build images ใหม่..."
sudo docker compose build --no-cache || { log_error "ไม่สามารถ build images ได้"; exit 1; }

# เริ่ม containers
log_info "กำลังเริ่ม containers..."
sudo docker compose up -d || { log_error "ไม่สามารถเริ่ม containers ได้"; exit 1; }

# รอให้ services พร้อมใช้งาน
log_info "รอให้ services พร้อมใช้งาน..."
sleep 10

# ตรวจสอบสถานะ
DB_RUNNING=$(sudo docker ps --filter "name=db" --format "{{.Status}}" | grep -c "Up")
APP_RUNNING=$(sudo docker ps --filter "name=nextjs-app" --format "{{.Status}}" | grep -c "Up")
METABASE_RUNNING=$(sudo docker ps --filter "name=metabase" --format "{{.Status}}" | grep -c "Up")

if [ "$DB_RUNNING" -eq 1 ] && [ "$APP_RUNNING" -eq 1 ] && [ "$METABASE_RUNNING" -eq 1 ]; then
    log_info "ทุก services กำลังทำงาน!"
else
    log_warn "บาง services อาจจะยังไม่ทำงาน:"
    [ "$DB_RUNNING" -eq 0 ] && log_warn "- PostgreSQL ยังไม่ทำงาน"
    [ "$APP_RUNNING" -eq 0 ] && log_warn "- Next.js App ยังไม่ทำงาน"
    [ "$METABASE_RUNNING" -eq 0 ] && log_warn "- Metabase ยังไม่ทำงาน"
fi

# แสดงเวลาที่ใช้ในการ deploy
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
log_info "Deploy เสร็จสมบูรณ์! ใช้เวลาทั้งหมด: $DURATION วินาที"
log_info "ตรวจสอบ logs ด้วยคำสั่ง: sudo docker compose logs -f" 