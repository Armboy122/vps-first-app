#!/bin/bash

# 🚀 Ultra-Fast Production Build & Deploy Script
# Version: 2.0 - Optimized for Speed & Reliability

set -euo pipefail  # Strict error handling

# ==================== CONFIGURATION ====================
readonly SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LOG_FILE="/tmp/docker-build-$(date +%s).log"

# Docker Configuration
readonly DOCKER_IMAGE_NAME="armboy/vps-first-app"
readonly DOCKER_TAG="latest"
readonly BUILD_CONTEXT="."
readonly COMPOSE_FILE="docker-compose.yml"

# Timeouts (seconds)
readonly DB_TIMEOUT=60
readonly APP_TIMEOUT=90
readonly BUILD_TIMEOUT=600

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

# ==================== LOGGING FUNCTIONS ====================
log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $*" | tee -a "$LOG_FILE"; }
success() { echo -e "${GREEN}✅ $*${NC}" | tee -a "$LOG_FILE"; }
warning() { echo -e "${YELLOW}⚠️  $*${NC}" | tee -a "$LOG_FILE"; }
error() { echo -e "${RED}❌ $*${NC}" | tee -a "$LOG_FILE"; }
info() { echo -e "${CYAN}ℹ️  $*${NC}" | tee -a "$LOG_FILE"; }
step() { echo -e "\n${PURPLE}🔸 $*${NC}" | tee -a "$LOG_FILE"; }

# ==================== UTILITY FUNCTIONS ====================
spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        error "$1 ไม่พบในระบบ กรุณาติดตั้งก่อน"
        exit 1
    fi
}

check_file() {
    if [[ ! -f "$1" ]]; then
        error "ไม่พบไฟล์: $1"
        exit 1
    fi
}

get_container_status() {
    docker-compose ps --format "table {{.Name}}\t{{.State}}\t{{.Status}}" 2>/dev/null || echo "No containers"
}

wait_for_service() {
    local service_name="$1"
    local health_check="$2"
    local timeout="$3"
    local counter=0
    
    log "รอให้ $service_name พร้อมใช้งาน..."
    
    while [ $counter -lt $timeout ]; do
        if eval "$health_check" >/dev/null 2>&1; then
            success "$service_name พร้อมใช้งาน (${counter}s)"
            return 0
        fi
        
        # Show progress every 15 seconds
        if [ $((counter % 15)) -eq 0 ] && [ $counter -gt 0 ]; then
            info "รอ $service_name... (${counter}/${timeout}s)"
        fi
        
        sleep 2
        counter=$((counter + 2))
        printf "."
    done
    
    error "$service_name ไม่พร้อมใช้งานภายใน ${timeout} วินาที"
    return 1
}

# ==================== CLEANUP & ROLLBACK ====================
cleanup() {
    log "ทำความสะอาด temporary files..."
    rm -f "${COMPOSE_FILE}.backup" "${COMPOSE_FILE}.bak" >/dev/null 2>&1 || true
    
    # Clean old build artifacts but keep cache
    docker builder prune -f --filter="until=24h" >/dev/null 2>&1 || true
    
    success "ทำความสะอาดเสร็จสิ้น"
}

rollback() {
    error "เกิดข้อผิดพลาด: $1"
    echo ""
    
    log "🔄 เริ่มต้นกระบวนการ rollback..."
    
    # Restore docker-compose.yml
    if [[ -f "${COMPOSE_FILE}.backup" ]]; then
        mv "${COMPOSE_FILE}.backup" "$COMPOSE_FILE"
        success "คืนค่า docker-compose.yml เรียบร้อยแล้ว"
        
        # Try to restart with old configuration
        if docker-compose up -d >/dev/null 2>&1; then
            success "Rollback สำเร็จ - ระบบกลับสู่สถานะเดิม"
        else
            warning "ไม่สามารถ rollback อัตโนมัติได้ กรุณาตรวจสอบ manual"
        fi
    else
        warning "ไม่พบไฟล์ backup สำหรับ rollback"
    fi
    
    # Show debugging info
    echo ""
    error "🔧 Debug Information:"
    echo "  📋 Container Status:"
    get_container_status | sed 's/^/    /'
    echo ""
    echo "  📋 Recent Logs:"
    docker-compose logs --tail=5 2>/dev/null | sed 's/^/    /' || echo "    No logs available"
    echo ""
    echo "  📋 Troubleshooting Commands:"
    echo "    • docker-compose logs -f"
    echo "    • docker system df"
    echo "    • docker-compose down && docker-compose up -d"
    echo "    • Log file: $LOG_FILE"
    
    cleanup
    exit 1
}

# ==================== VALIDATION FUNCTIONS ====================
pre_flight_checks() {
    step "Pre-flight Checks"
    
    # Check required commands
    for cmd in docker docker-compose curl; do
        check_command "$cmd"
    done
    
    # Check required files
    for file in Dockerfile package.json "$COMPOSE_FILE"; do
        check_file "$file"
    done
    
    # Check Docker daemon
    if ! docker info >/dev/null 2>&1; then
        error "Docker daemon ไม่ทำงาน กรุณาเริ่ม Docker Desktop"
        exit 1
    fi
    
    # Check disk space
    local disk_usage
    disk_usage=$(df . | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 85 ]; then
        warning "พื้นที่ disk เหลือน้อย (${disk_usage}%)"
        read -p "ต้องการดำเนินการต่อหรือไม่? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "ยกเลิกเนื่องจากพื้นที่ disk เหลือน้อย"
            exit 1
        fi
    fi
    
    # Check if ports are available
    for port in 3000 5432; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            local process_info
            process_info=$(lsof -Pi :$port -sTCP:LISTEN | tail -n +2)
            if [[ ! "$process_info" =~ docker ]]; then
                warning "Port $port ถูกใช้งานโดยโปรเซสอื่น"
                echo "$process_info"
            fi
        fi
    done
    
    success "Pre-flight checks ผ่านทั้งหมด"
}

# ==================== BUILD FUNCTIONS ====================
optimize_docker_environment() {
    step "Docker Environment Optimization"
    
    # Show current Docker usage
    local docker_usage
    docker_usage=$(docker system df --format "table {{.Type}}\t{{.TotalCount}}\t{{.Size}}" 2>/dev/null)
    info "Docker Usage:"
    echo "$docker_usage" | sed 's/^/  /'
    
    # Clean up unused resources (but keep build cache)
    log "ทำความสะอาด Docker resources ที่ไม่ใช้..."
    {
        docker container prune -f
        docker network prune -f
        docker image prune -f --filter="dangling=true"
    } >/dev/null 2>&1 || true
    
    success "Docker environment พร้อมใช้งาน"
}

build_image() {
    step "Building Docker Image"
    
    log "เริ่ม build image: $DOCKER_IMAGE_NAME:$DOCKER_TAG"
    info "Build context: $BUILD_CONTEXT"
    info "Build timeout: ${BUILD_TIMEOUT}s"
    
    # Build with timeout
    local build_start
    build_start=$(date +%s)
    
    if timeout "$BUILD_TIMEOUT" docker build \
        --platform linux/amd64 \
        -t "$DOCKER_IMAGE_NAME:$DOCKER_TAG" \
        --build-arg NODE_ENV=production \
        --progress=plain \
        "$BUILD_CONTEXT" 2>&1 | tee -a "$LOG_FILE"; then
        
        local build_end
        build_end=$(date +%s)
        local build_time=$((build_end - build_start))
        
        success "Build สำเร็จใน ${build_time} วินาที"
        
        # Show image size
        local image_size
        image_size=$(docker images "$DOCKER_IMAGE_NAME:$DOCKER_TAG" --format "{{.Size}}" | head -1)
        info "Image size: $image_size"
        
        return 0
    else
        error "Build ล้มเหลว หรือใช้เวลาเกิน ${BUILD_TIMEOUT} วินาที"
        return 1
    fi
}

test_image() {
    step "Testing Built Image"
    
    log "ทดสอบ image ที่ build แล้ว..."
    
    # Test basic functionality
    if docker run --rm "$DOCKER_IMAGE_NAME:$DOCKER_TAG" node --version >/dev/null 2>&1; then
        success "Image ทำงานได้ปกติ"
    else
        error "Image มีปัญหา - ไม่สามารถรัน node ได้"
        return 1
    fi
    
    # Test if all required files exist
    local test_files=("package.json" ".next" "prisma")
    for file in "${test_files[@]}"; do
        if docker run --rm "$DOCKER_IMAGE_NAME:$DOCKER_TAG" test -e "$file" >/dev/null 2>&1; then
            info "✓ $file พบในภาพ"
        else
            warning "⚠ $file ไม่พบในภาพ"
        fi
    done
    
    success "Image testing ผ่าน"
}

# ==================== DEPLOYMENT FUNCTIONS ====================
backup_current_config() {
    step "Backing Up Current Configuration"
    
    # Backup docker-compose.yml
    cp "$COMPOSE_FILE" "${COMPOSE_FILE}.backup"
    success "สำรอง $COMPOSE_FILE เรียบร้อยแล้ว"
    
    # Get current image info
    local current_image
    current_image=$(grep "image: $DOCKER_IMAGE_NAME" "$COMPOSE_FILE" | head -1 | sed 's/.*image: //' | tr -d ' ' || echo "none")
    if [[ "$current_image" != "none" ]]; then
        info "Current image: $current_image"
    else
        info "ไม่พบ image ปัจจุบันใน compose file"
    fi
}

update_compose_file() {
    step "Updating Docker Compose Configuration"
    
    log "อัปเดต image ใน $COMPOSE_FILE..."
    
    # Update image tag in docker-compose.yml
    sed -i.bak "s|image: $DOCKER_IMAGE_NAME:.*|image: $DOCKER_IMAGE_NAME:$DOCKER_TAG|g" "$COMPOSE_FILE"
    
    # Verify the change
    local updated_image
    updated_image=$(grep "image: $DOCKER_IMAGE_NAME" "$COMPOSE_FILE" | head -1 | sed 's/.*image: //' | tr -d ' ')
    
    if [[ "$updated_image" == "$DOCKER_IMAGE_NAME:$DOCKER_TAG" ]]; then
        success "อัปเดต compose file เรียบร้อยแล้ว"
        info "New image: $updated_image"
    else
        error "ไม่สามารถอัปเดต compose file ได้"
        return 1
    fi
}

deploy_services() {
    step "Deploying Services"
    
    log "หยุด services เดิม..."
    docker-compose down --remove-orphans >/dev/null 2>&1 || true
    
    log "เริ่มต้น services ใหม่..."
    if docker-compose up -d; then
        success "Services เริ่มทำงานเรียบร้อยแล้ว"
    else
        error "ไม่สามารถเริ่ม services ได้"
        return 1
    fi
}

verify_deployment() {
    step "Verifying Deployment"
    
    # Wait for database
    if ! wait_for_service "Database" \
        "docker exec db pg_isready -U sa -d PeaTransformer" \
        "$DB_TIMEOUT"; then
        rollback "Database ไม่พร้อมใช้งาน"
    fi
    
    echo ""
    
    # Wait for Next.js app
    if ! wait_for_service "Next.js App" \
        "curl -f -m 3 http://localhost:3000/api/health" \
        "$APP_TIMEOUT"; then
        rollback "Next.js App ไม่พร้อมใช้งาน"
    fi
    
    echo ""
    success "Deployment verification สำเร็จ"
}

# ==================== REPORTING ====================
show_deployment_summary() {
    step "Deployment Summary"
    
    local deployment_time=$(($(date +%s) - START_TIME))
    
    echo ""
    echo -e "${GREEN}🎉 DEPLOYMENT SUCCESSFUL! 🎉${NC}"
    echo ""
    echo -e "${BLUE}📊 Summary:${NC}"
    echo "  • Image: $DOCKER_IMAGE_NAME:$DOCKER_TAG"
    echo "  • Total Time: ${deployment_time}s"
    echo "  • Next.js App: http://localhost:3000"
    echo "  • Metabase: http://localhost:3001"
    echo "  • Database: localhost:5432"
    echo ""
    
    echo -e "${BLUE}🐳 Container Status:${NC}"
    get_container_status | sed 's/^/  /'
    echo ""
    
    # Show Docker usage after deployment
    local final_usage
    final_usage=$(docker system df --format "table {{.Type}}\t{{.TotalCount}}\t{{.Size}}" 2>/dev/null)
    echo -e "${BLUE}💾 Docker Usage:${NC}"
    echo "$final_usage" | sed 's/^/  /'
    echo ""
    
    echo -e "${CYAN}🔧 Useful Commands:${NC}"
    echo "  • View logs: docker-compose logs -f"
    echo "  • Restart: docker-compose restart"
    echo "  • Stop: docker-compose down"
    echo "  • Clean: docker system prune -f"
    echo "  • Build log: $LOG_FILE"
    echo ""
    
    success "All systems operational! 🚀"
}

# ==================== ERROR HANDLING ====================
trap 'rollback "Unexpected error on line $LINENO"' ERR
trap cleanup EXIT

# ==================== MAIN EXECUTION ====================
main() {
    local START_TIME
    START_TIME=$(date +%s)
    
    echo ""
    echo -e "${PURPLE}🚀 Production Build & Deploy Script v2.0${NC}"
    echo -e "${BLUE}=================================================${NC}"
    echo "  Image: $DOCKER_IMAGE_NAME:$DOCKER_TAG"
    echo "  Log: $LOG_FILE"
    echo "  Started: $(date)"
    echo -e "${BLUE}=================================================${NC}"
    echo ""
    
    # Execute deployment pipeline
    pre_flight_checks
    optimize_docker_environment
    backup_current_config
    
    if ! build_image; then
        rollback "Docker build failed"
    fi
    
    if ! test_image; then
        rollback "Image testing failed"
    fi
    
    update_compose_file
    deploy_services
    verify_deployment
    show_deployment_summary
    
    cleanup
}

# ==================== SCRIPT ENTRY POINT ====================
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi