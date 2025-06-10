#!/bin/bash

# 🚀 Simplified Production Build & Deploy Script
# Version: 3.0 - Simplified & Safe Cleanup

set -euo pipefail

# ==================== CONFIGURATION ====================
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LOG_FILE="/tmp/docker-build-$(date +%s).log"

# Docker Configuration
readonly DOCKER_IMAGE_NAME="armboy/vps-first-app"
readonly DOCKER_TAG="latest"
readonly COMPOSE_FILE="docker-compose.yml"

# Timeouts (seconds)
readonly SERVICE_TIMEOUT=120

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

# ==================== LOGGING ====================
log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $*"; }
success() { echo -e "${GREEN}✅ $*${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $*${NC}"; }
error() { echo -e "${RED}❌ $*${NC}"; }
step() { echo -e "\n${PURPLE}🔸 $*${NC}"; }

# ==================== UTILITIES ====================
check_requirements() {
    step "ตรวจสอบความพร้อม"
    
    for cmd in docker docker-compose; do
        if ! command -v "$cmd" &> /dev/null; then
            error "$cmd ไม่พบในระบบ"
            exit 1
        fi
    done
    
    for file in Dockerfile package.json "$COMPOSE_FILE"; do
        if [[ ! -f "$file" ]]; then
            error "ไม่พบไฟล์: $file"
            exit 1
        fi
    done
    
    if ! docker info >/dev/null 2>&1; then
        error "Docker daemon ไม่ทำงาน"
        exit 1
    fi
    
    success "ความพร้อมครบถ้วน"
}

wait_for_services() {
    step "รอ Services เริ่มทำงาน"
    
    local counter=0
    while [ $counter -lt $SERVICE_TIMEOUT ]; do
        # Check database
        if docker exec db pg_isready -U sa -d PeaTransformer >/dev/null 2>&1; then
            # Check app
            if curl -f -m 3 http://localhost:3000/api/health >/dev/null 2>&1; then
                success "Services พร้อมใช้งาน (${counter}s)"
                return 0
            fi
        fi
        
        sleep 2
        counter=$((counter + 2))
        
        if [ $((counter % 20)) -eq 0 ]; then
            log "รอ services... (${counter}s)"
        fi
    done
    
    error "Services ไม่พร้อมภายใน ${SERVICE_TIMEOUT} วินาที"
    return 1
}

# ==================== SAFE CLEANUP ====================
safe_cleanup() {
    step "ทำความสะอาดอย่างปลอดภัย"
    
    log "กำลังทำความสะอาด Docker resources ที่ไม่ใช้..."
    
    # Clean stopped containers (safe)
    if docker container prune -f >/dev/null 2>&1; then
        success "ลบ containers ที่หยุดทำงานแล้ว"
    fi
    
    # Clean dangling images only (safe)
    if docker image prune -f --filter="dangling=true" >/dev/null 2>&1; then
        success "ลบ dangling images แล้ว"
    fi
    
    # Clean unused networks (safe)
    if docker network prune -f >/dev/null 2>&1; then
        success "ลบ networks ที่ไม่ใช้แล้ว"
    fi
    
    # Clean old build artifacts (safe, keeps cache)
    if docker builder prune -f --filter="until=48h" >/dev/null 2>&1; then
        success "ลบ build artifacts เก่าแล้ว"
    fi
    
    # Show current usage
    log "Docker usage หลัง cleanup:"
    docker system df | grep -E "(TYPE|Images|Containers|Local Volumes|Build Cache)" | sed 's/^/  /'
    
    success "ทำความสะอาดเสร็จสิ้น (ไม่ลบ volumes และ cache ที่ใช้งาน)"
}

deep_cleanup() {
    step "ทำความสะอาดระดับลึก (ปลอดภัย)"
    
    warning "การทำความสะอาดระดับลึก - จะไม่ลบ volumes ที่ใช้งาน"
    
    # Show current volumes
    log "Volumes ปัจจุบัน:"
    docker volume ls --format "table {{.Driver}}\t{{.Name}}" | sed 's/^/  /'
    
    # Get currently used volumes
    local used_volumes
    used_volumes=$(docker-compose config --volumes 2>/dev/null || echo "")
    
    if [[ -n "$used_volumes" ]]; then
        log "Volumes ที่ใช้งาน: $used_volumes"
    fi
    
    # Clean unused volumes only (safe)
    if docker volume prune -f >/dev/null 2>&1; then
        success "ลบ volumes ที่ไม่ใช้แล้ว"
    fi
    
    # Clean unused everything except volumes and cache
    log "ทำความสะอาด unused resources..."
    docker system prune -f --filter="until=24h" >/dev/null 2>&1 || true
    
    success "Deep cleanup เสร็จสิ้น"
}

# ==================== ROLLBACK ====================
rollback() {
    error "เกิดข้อผิดพลาด: $1"
    
    if [[ -f "${COMPOSE_FILE}.backup" ]]; then
        log "กำลัง rollback..."
        mv "${COMPOSE_FILE}.backup" "$COMPOSE_FILE"
        docker-compose up -d >/dev/null 2>&1 || true
        success "Rollback เสร็จสิ้น"
    fi
    
    safe_cleanup
    exit 1
}

# ==================== MAIN FUNCTIONS ====================
build_and_test() {
    step "Build & Test Docker Image"
    
    log "กำลัง build: $DOCKER_IMAGE_NAME:$DOCKER_TAG"
    
    if docker build \
        --platform linux/amd64 \
        -t "$DOCKER_IMAGE_NAME:$DOCKER_TAG" \
        --build-arg NODE_ENV=production \
        . >/dev/null 2>&1; then
        
        success "Build สำเร็จ"
        
        # Quick test
        if docker run --rm "$DOCKER_IMAGE_NAME:$DOCKER_TAG" node --version >/dev/null 2>&1; then
            success "Image ทำงานได้ปกติ"
        else
            error "Image มีปัญหา"
            return 1
        fi
    else
        error "Build ล้มเหลว"
        return 1
    fi
}

deploy() {
    step "Deploy Services"
    
    # Backup current config
    cp "$COMPOSE_FILE" "${COMPOSE_FILE}.backup"
    
    # Update compose file
    sed -i.bak "s|image: $DOCKER_IMAGE_NAME:.*|image: $DOCKER_IMAGE_NAME:$DOCKER_TAG|g" "$COMPOSE_FILE"
    
    # Deploy
    log "กำลัง deploy..."
    docker-compose down --remove-orphans >/dev/null 2>&1 || true
    
    if docker-compose up -d >/dev/null 2>&1; then
        success "Deploy สำเร็จ"
        
        if wait_for_services; then
            success "Services ทำงานปกติ"
        else
            rollback "Services ไม่พร้อม"
        fi
    else
        rollback "Deploy ล้มเหลว"
    fi
}

show_summary() {
    step "สรุป"
    
    echo ""
    echo -e "${GREEN}🎉 DEPLOYMENT SUCCESSFUL! 🎉${NC}"
    echo ""
    echo -e "${CYAN}🔗 Services:${NC}"
    echo "  • Next.js: http://localhost:3000"
    echo "  • Metabase: http://localhost:3001"
    echo "  • Database: localhost:5432"
    echo ""
    
    echo -e "${CYAN}🐳 Containers:${NC}"
    docker-compose ps --format "table {{.Name}}\t{{.State}}" | sed 's/^/  /'
    echo ""
    
    echo -e "${CYAN}💾 Storage:${NC}"
    docker system df | head -5 | sed 's/^/  /'
    echo ""
    
    success "ระบบพร้อมใช้งาน! 🚀"
}

# ==================== ERROR HANDLING ====================
trap 'rollback "Unexpected error"' ERR
trap 'rm -f "${COMPOSE_FILE}.backup" "${COMPOSE_FILE}.bak" 2>/dev/null || true' EXIT

# ==================== MAIN ====================
main() {
    local start_time
    start_time=$(date +%s)
    
    echo ""
    echo -e "${PURPLE}🚀 Simplified Production Deploy${NC}"
    echo -e "${BLUE}==============================${NC}"
    echo ""
    
    # Main pipeline
    check_requirements
    safe_cleanup
    build_and_test
    deploy
    show_summary
    
    # Final cleanup
    rm -f "${COMPOSE_FILE}.backup" "${COMPOSE_FILE}.bak" 2>/dev/null || true
    
    local total_time=$(($(date +%s) - start_time))
    success "เสร็จสิ้นใน ${total_time} วินาที"
}

# ==================== SCRIPT ENTRY ====================
case "${1:-}" in
    "clean")
        echo -e "${PURPLE}🧹 Safe Cleanup Mode${NC}"
        safe_cleanup
        ;;
    "deep-clean")
        echo -e "${PURPLE}🧹 Deep Cleanup Mode${NC}"
        deep_cleanup
        ;;
    *)
        main "$@"
        ;;
esac