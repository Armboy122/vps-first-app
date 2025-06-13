#!/bin/bash
set -e

# ---------- CONFIG ----------
IMAGE_NAME="armboy/vps-first-app"
CONTAINER_NAME="vps-first-app"
DEFAULT_RUNTIME_DAYS=2  # จำนวนวันที่ต้องการให้ container รัน
PORT=3000
# ----------------------------

# Function to convert days to seconds
days_to_seconds() {
  echo $(($1 * 86400))
}

# Function to show help
show_help() {
  echo "การใช้งาน: $0 [options]"
  echo "ตัวเลือก:"
  echo "  -e, --environment <dev|prod>  เลือกสภาพแวดล้อม (dev หรือ prod) [ค่าเริ่มต้น: prod]"
  echo "  -d, --days <number>           จำนวนวันที่ต้องการให้ container รัน [ค่าเริ่มต้น: $DEFAULT_RUNTIME_DAYS]"
  echo "  -f, --forever                 รัน container ไม่มีกำหนด"
  echo "  -t, --tag <tag>               ระบุ tag ที่ต้องการใช้ (ถ้าไม่ระบุจะใช้ latest หรือ dev-latest)"
  echo "  -h, --help                    แสดงวิธีใช้งาน"
  exit 0
}

# Default values
ENVIRONMENT="prod"
RUNTIME_DAYS=$DEFAULT_RUNTIME_DAYS
FOREVER=false
CUSTOM_TAG=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    -e|--environment)
      ENVIRONMENT="$2"
      shift 2
      ;;
    -d|--days)
      RUNTIME_DAYS="$2"
      shift 2
      ;;
    -f|--forever)
      FOREVER=true
      shift
      ;;
    -t|--tag)
      CUSTOM_TAG="$2"
      shift 2
      ;;
    -h|--help)
      show_help
      ;;
    *)
      echo "ตัวเลือกไม่ถูกต้อง: $1"
      show_help
      ;;
  esac
done

# Get the appropriate tag based on environment and custom tag
if [ -n "$CUSTOM_TAG" ]; then
  TAG="$CUSTOM_TAG"
elif [ "$ENVIRONMENT" == "dev" ]; then
  TAG="dev-latest"
else
  TAG="latest"
fi

FULL_IMAGE_NAME="$IMAGE_NAME:$TAG"

# Print config
echo "🚀 เตรียมรัน container:"
echo " - Image: $FULL_IMAGE_NAME"
echo " - Container name: $CONTAINER_NAME"
echo " - Port: $PORT"

if [ "$FOREVER" = true ]; then
  echo " - จะรันไม่มีกำหนด"
else
  echo " - จะรันเป็นเวลา $RUNTIME_DAYS วัน"
fi

# Check if container already exists and stop it
if docker ps -a --format '{{.Names}}' | grep -q "^$CONTAINER_NAME$"; then
  echo "🛑 พบ container ชื่อ $CONTAINER_NAME ที่มีอยู่แล้ว กำลังหยุดและลบ..."
  docker stop $CONTAINER_NAME || true
  docker rm $CONTAINER_NAME || true
fi

# Pull the latest image
echo "📥 กำลังดึง image ล่าสุด..."
docker pull $FULL_IMAGE_NAME

# Start the container
echo "🚀 กำลังเริ่มต้น container..."
docker run -d \
  --name $CONTAINER_NAME \
  -p $PORT:$PORT \
  -e PORT=$PORT \
  --restart unless-stopped \
  $FULL_IMAGE_NAME

echo "✅ Container เริ่มทำงานแล้ว"
echo "📊 สามารถเข้าใช้งานได้ที่ http://localhost:$PORT"

# Set up timer if not running forever
if [ "$FOREVER" = false ]; then
  RUNTIME_SECONDS=$(days_to_seconds $RUNTIME_DAYS)
  
  echo "⏱️ Container จะทำงานเป็นเวลา $RUNTIME_DAYS วัน ($(printf "%'d" $RUNTIME_SECONDS) วินาที)"
  echo "⏳ เริ่มนับเวลา... (กด Ctrl+C เพื่อหยุดการแสดงเวลาแต่ container จะยังทำงานต่อไป)"
  
  START_TIME=$(date +%s)
  END_TIME=$((START_TIME + RUNTIME_SECONDS))
  
  # Show running time and set up shutdown
  (
    trap "echo 'ยกเลิกการแสดงเวลา แต่ container ยังทำงานอยู่'" INT
    
    while true; do
      CURRENT_TIME=$(date +%s)
      ELAPSED=$((CURRENT_TIME - START_TIME))
      REMAINING=$((END_TIME - CURRENT_TIME))
      
      if [ $REMAINING -le 0 ]; then
        echo "⌛ หมดเวลาที่กำหนด กำลังหยุด container..."
        docker stop $CONTAINER_NAME
        echo "🛑 Container หยุดทำงานแล้ว"
        break
      fi
      
      # Calculate days, hours, minutes, seconds
      ELAPSED_DAYS=$((ELAPSED / 86400))
      ELAPSED_HOURS=$(((ELAPSED % 86400) / 3600))
      ELAPSED_MINUTES=$(((ELAPSED % 3600) / 60))
      ELAPSED_SECONDS=$((ELAPSED % 60))
      
      REMAINING_DAYS=$((REMAINING / 86400))
      REMAINING_HOURS=$(((REMAINING % 86400) / 3600))
      REMAINING_MINUTES=$(((REMAINING % 3600) / 60))
      REMAINING_SECONDS=$((REMAINING % 60))
      
      # Clear line and show progress
      echo -ne "\r⏱️ เวลาที่ผ่านไป: ${ELAPSED_DAYS}วัน ${ELAPSED_HOURS}ชม. ${ELAPSED_MINUTES}นาที ${ELAPSED_SECONDS}วินาที | เหลือเวลา: ${REMAINING_DAYS}วัน ${REMAINING_HOURS}ชม. ${REMAINING_MINUTES}นาที ${REMAINING_SECONDS}วินาที      "
      
      sleep 1
    done
  ) &
  
  echo ""
  echo "💡 คำแนะนำ:"
  echo "- หากต้องการหยุด container ก่อนเวลา ให้ใช้คำสั่ง: docker stop $CONTAINER_NAME"
  echo "- หากต้องการดูบันทึก: docker logs -f $CONTAINER_NAME"
else
  echo ""
  echo "💡 คำแนะนำ:"
  echo "- Container จะทำงานไม่มีกำหนดจนกว่าจะหยุดด้วยตนเอง"
  echo "- หากต้องการหยุด container ให้ใช้คำสั่ง: docker stop $CONTAINER_NAME"
  echo "- หากต้องการดูบันทึก: docker logs -f $CONTAINER_NAME"
fi 