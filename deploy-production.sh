#!/bin/bash

# 🚀 Production Deploy Script - Simple & Safe
# Version: 3.0 - Optimized for Production Server
# Focus: Speed, Safety, Resource Management

set -euo pipefail

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

# Config
readonly DOCKER_IMAGE="armboy/vps-first-app:latest"
readonly LOG_FILE="/tmp/production-deploy-$(date +%Y%m%d-%H%M%S).log"
readonly SCRIPT_START=$(date +%s)

# Logging Functions
log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $*" | tee -a "$LOG_FILE"; }
success() { echo -e "${GREEN}✅ $*${NC}" | tee -a "$LOG_FILE"; }
warning() { echo -e "${YELLOW}⚠️  $*${NC}" | tee -a "$LOG_FILE"; }
error() { echo -e "${RED}❌ $*${NC}" | tee -a "$LOG_FILE"; }
info() { echo -e "${CYAN}ℹ️  $*${NC}" | tee -a "$LOG_FILE"; }
step() { echo -e "\n${PURPLE}🔸 $*${NC}" | tee -a "$LOG_FILE"; }

# Error handling
cleanup() {
    log "ทำความสะอาด temporary files..."
    rm -f docker-compose.yml.backup 2>/dev/null || true
}

rollback() {
    error "เกิดข้อผิดพลาด: $1"
    if [[ -f "docker-compose.yml.backup" ]]; then
        log "🔄 กำลัง rollback..."
        mv docker-compose.yml.backup docker-compose.yml
        docker-compose up -d || true
        success "Rollback เสร็จสิ้น"
    fi
    cleanup
    exit 1
}

trap 'rollback "Unexpected error on line $LINENO"' ERR
trap cleanup EXIT

# Pre-flight checks
pre_flight_checks() {
    step "Pre-flight Checks"
    
    # Check if we're in the right directory
    if [[ ! -f "Dockerfile" ]] || [[ ! -f "docker-compose.yml" ]]; then
        error "ไม่พบ Dockerfile หรือ docker-compose.yml"
        exit 1
    fi
    
    # Check Docker
    if ! docker info >/dev/null 2>&1; then
        error "Docker daemon ไม่ทำงาน"
        exit 1
    fi
    
    # Check disk space
    local disk_usage=$(df . | tail -1 | awk '{print $5}' | sed 's/%//')
    if [[ "$disk_usage" -gt 90 ]]; then
        error "พื้นที่ disk เต็มเกิน 90% (${disk_usage}%)"
        exit 1
    fi
    
    success "Pre-flight checks ผ่าน"
}

# Stop all services safely
stop_services() {
    step "Stopping Services"
    
    # Backup current config
    cp docker-compose.yml docker-compose.yml.backup
    
    log "หยุด services ปัจจุบัน..."
    docker-compose down --remove-orphans 2>/dev/null || true
    
    # Wait for containers to fully stop
    sleep 3
    
    # Remove any orphaned containers
    docker container prune -f >/dev/null 2>&1 || true
    
    success "Services หยุดเรียบร้อย"
}

# Build new image
build_image() {
    step "Building New Image"
    
    local build_start=$(date +%s)
    
    log "เริ่ม build image: $DOCKER_IMAGE"
    
    # Build with platform specification for production
    if docker build \
        --platform linux/amd64 \
        -t "$DOCKER_IMAGE" \
        --build-arg NODE_ENV=production \
        --no-cache \
        . 2>&1 | tee -a "$LOG_FILE"; then
        
        local build_end=$(date +%s)
        local build_time=$((build_end - build_start))
        
        success "Build สำเร็จใน ${build_time} วินาที"
        
        # Show image size
        local image_size=$(docker images "$DOCKER_IMAGE" --format "{{.Size}}" | head -1)
        info "Image size: $image_size"
        
    else
        error "Build ล้มเหลว"
        return 1
    fi
}

# Clean up old images and containers
cleanup_docker() {
    step "Cleaning Docker Resources"
    
    log "ทำความสะอาด Docker resources..."
    
    # Remove dangling images
    docker image prune -f >/dev/null 2>&1 || true
    
    # Remove unused containers
    docker container prune -f >/dev/null 2>&1 || true
    
    # Remove unused networks
    docker network prune -f >/dev/null 2>&1 || true
    
    success "Docker cleanup เสร็จสิ้น"
}

# Start services
start_services() {
    step "Starting Services"
    
    log "เริ่ม services ใหม่..."
    
    if docker-compose up -d; then
        success "Services เริ่มทำงานเรียบร้อย"
    else
        error "ไม่สามารถเริ่ม services ได้"
        return 1
    fi
}

# Health checks
health_checks() {
    step "Health Checks"
    
    # Wait for database
    log "รอให้ database พร้อม..."
    local db_timeout=60
    local db_counter=0
    
    while [[ $db_counter -lt $db_timeout ]]; do
        if docker exec db pg_isready -U sa -d PeaTransformer >/dev/null 2>&1; then
            success "Database พร้อมใช้งาน (${db_counter}s)"
            break
        fi
        
        if [[ $((db_counter % 10)) -eq 0 ]] && [[ $db_counter -gt 0 ]]; then
            info "รอ database... (${db_counter}/${db_timeout}s)"
        fi
        
        sleep 2
        db_counter=$((db_counter + 2))
        printf "."
    done
    
    if [[ $db_counter -ge $db_timeout ]]; then
        error "Database ไม่พร้อมใช้งานภายใน ${db_timeout} วินาที"
        return 1
    fi
    
    echo ""
    
    # Wait for Next.js app
    log "รอให้ Next.js app พร้อม..."
    local app_timeout=90
    local app_counter=0
    
    while [[ $app_counter -lt $app_timeout ]]; do
        if curl -f -m 3 http://localhost:3000/api/health >/dev/null 2>&1; then
            success "Next.js app พร้อมใช้งาน (${app_counter}s)"
            break
        fi
        
        if [[ $((app_counter % 15)) -eq 0 ]] && [[ $app_counter -gt 0 ]]; then
            info "รอ Next.js app... (${app_counter}/${app_timeout}s)"
        fi
        
        sleep 2
        app_counter=$((app_counter + 2))
        printf "."
    done
    
    if [[ $app_counter -ge $app_timeout ]]; then
        error "Next.js app ไม่พร้อมใช้งานภายใน ${app_timeout} วินาที"
        return 1
    fi
    
    echo ""
    success "Health checks ผ่านทั้งหมด"
}

# Show deployment summary
show_summary() {
    step "Deployment Summary"
    
    local total_time=$(($(date +%s) - SCRIPT_START))
    
    echo ""
    echo -e "${GREEN}🎉 PRODUCTION DEPLOYMENT SUCCESSFUL! 🎉${NC}"
    echo ""
    echo -e "${BLUE}📊 Summary:${NC}"
    echo "  • Image: $DOCKER_IMAGE"
    echo "  • Total Time: ${total_time}s"
    echo "  • Production URL: https://peas3.shop"
    echo "  • Metabase: http://localhost:3001"
    echo ""
    
    echo -e "${BLUE}🐳 Container Status:${NC}"
    docker-compose ps --format "table {{.Name}}\t{{.State}}\t{{.Status}}" | sed 's/^/  /'
    echo ""
    
    echo -e "${BLUE}💾 Resource Usage:${NC}"
    docker system df --format "table {{.Type}}\t{{.TotalCount}}\t{{.Size}}" | sed 's/^/  /'
    echo ""
    
    echo -e "${CYAN}🔧 Useful Commands:${NC}"
    echo "  • View logs: docker-compose logs -f"
    echo "  • Restart: docker-compose restart"
    echo "  • Stop: docker-compose down"
    echo "  • Deploy log: $LOG_FILE"
    echo ""
    
    success "Production deployment completed successfully! 🚀"
}

# Main execution
main() {
    echo ""
    echo -e "${PURPLE}🚀 Production Deployment Script v3.0${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo "  Target: $DOCKER_IMAGE"
    echo "  Started: $(date)"
    echo "  Log: $LOG_FILE"
    echo -e "${BLUE}============================================${NC}"
    echo ""
    
    pre_flight_checks
    stop_services
    build_image
    cleanup_docker
    start_services
    health_checks
    show_summary
    
    # Remove backup file on success
    rm -f docker-compose.yml.backup
}

# Execute main function
main "$@"
