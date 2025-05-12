#!/bin/bash
set -e

# ---------- CONFIG ----------
IMAGE_NAME="armboy/vps-first-app"
CONTAINER_NAME="vps-first-app-dev"
DEFAULT_RUNTIME_DAYS=2
DEFAULT_PORT=3002
TAG="dev-latest"
# ----------------------------

days_to_seconds() {
  echo $(($1 * 86400))
}

check_port_in_use() {
  local port=$1
  if command -v lsof >/dev/null 2>&1; then
    lsof -i :$port >/dev/null 2>&1
    return $?
  elif command -v netstat >/dev/null 2>&1; then
    netstat -tuln | grep -q ":$port "
    return $?
  else
    return 1
  fi
}

find_free_port() {
  local port=$1
  while check_port_in_use $port; do
    port=$((port + 1))
    if [ $port -gt 65535 ]; then
      echo "ไม่พบพอร์ตว่างที่ใช้งานได้" >&2
      return 1
    fi
  done
  echo $port
}

show_help() {
  echo "การใช้งาน: $0 [options]"
  echo "ตัวเลือก:"
  echo "  -d, --days <number>      จำนวนวันที่ต้องการให้ container รัน [ค่าเริ่มต้น: $DEFAULT_RUNTIME_DAYS]"
  echo "  -f, --forever            รัน container ไม่มีกำหนด"
  echo "  -t, --tag <tag>          ระบุ tag ที่ต้องการใช้ (ถ้าไม่ระบุจะใช้ $TAG)"
  echo "  -p, --port <port>        ระบุพอร์ตที่ต้องการใช้ [ค่าเริ่มต้น: $DEFAULT_PORT]"
  echo "  -a, --auto-port          เลือกพอร์ตอื่นโดยอัตโนมัติ"
  echo "  -h, --help               แสดงวิธีใช้งาน"
  exit 0
}

RUNTIME_DAYS=$DEFAULT_RUNTIME_DAYS
FOREVER=false
CUSTOM_TAG=""
PORT=$DEFAULT_PORT
AUTO_PORT=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    -d|--days) RUNTIME_DAYS="$2"; shift 2 ;;
    -f|--forever) FOREVER=true; shift ;;
    -t|--tag) CUSTOM_TAG="$2"; shift 2 ;;
    -p|--port) PORT="$2"; shift 2 ;;
    -a|--auto-port) AUTO_PORT=true; shift ;;
    -h|--help) show_help ;;
    *) echo "ตัวเลือกไม่ถูกต้อง: $1"; show_help ;;
  esac
done

if [ -n "$CUSTOM_TAG" ]; then
  TAG="$CUSTOM_TAG"
fi

FULL_IMAGE_NAME="$IMAGE_NAME:$TAG"

echo "🚀 เตรียมรัน development container (Bun):"
echo " - Image: $FULL_IMAGE_NAME"
echo " - Container name: $CONTAINER_NAME"
echo " - Port: $PORT"

if [ "$FOREVER" = true ]; then
  echo " - จะรันไม่มีกำหนด"
else
  echo " - จะรันเป็นเวลา $RUNTIME_DAYS วัน"
fi

if docker ps -a --format '{{.Names}}' | grep -q "^$CONTAINER_NAME$"; then
  echo "🛑 พบ container ชื่อ $CONTAINER_NAME ที่มีอยู่แล้ว กำลังหยุดและลบ..."
  docker stop $CONTAINER_NAME || true
  docker rm $CONTAINER_NAME || true
fi

if check_port_in_use $PORT; then
  echo "⚠️ พอร์ต $PORT ถูกใช้งานอยู่แล้ว"
  if [ "$AUTO_PORT" = true ]; then
    NEW_PORT=$(find_free_port $PORT)
    echo "🔄 เปลี่ยนไปใช้พอร์ต $NEW_PORT โดยอัตโนมัติ"
    PORT=$NEW_PORT
  else
    echo "โปรดเลือกการดำเนินการ:"
    echo "1) ใช้พอร์ตอื่นโดยอัตโนมัติ"
    echo "2) ระบุพอร์ตใหม่"
    echo "3) ยกเลิกการทำงาน"
    read -p "กรุณาเลือก [1-3]: " PORT_CHOICE
    case $PORT_CHOICE in
      1)
        NEW_PORT=$(find_free_port $PORT)
        echo "🔄 เปลี่ยนไปใช้พอร์ต $NEW_PORT"
        PORT=$NEW_PORT
        ;;
      2)
        read -p "ระบุพอร์ตใหม่: " NEW_PORT
        while check_port_in_use $NEW_PORT; do
          echo "⚠️ พอร์ต $NEW_PORT ยังถูกใช้งานอยู่ กรุณาเลือกพอร์ตอื่น"
          read -p "ระบุพอร์ตใหม่: " NEW_PORT
        done
        PORT=$NEW_PORT
        ;;
      *) echo "❌ ยกเลิกการทำงาน"; exit 1 ;;
    esac
  fi
fi

echo "📥 กำลังดึง development image ล่าสุด.."
docker pull $FULL_IMAGE_NAME

echo "🚀 กำลังเริ่มต้น development container บนพอร์ต $PORT..."
docker run -d \
  --name $CONTAINER_NAME \
  -p $PORT:$DEFAULT_PORT \
  -e PORT=$DEFAULT_PORT \
  -e NODE_ENV=development \
  --restart unless-stopped \
  $FULL_IMAGE_NAME

echo "✅ Development container เริ่มทำงานแล้ว"
echo "📊 สามารถเข้าใช้งานได้ที่ http://localhost:$PORT"
echo "🔄 โหมด development จะมีการ hot-reload เมื่อมีการเปลี่ยนแปลงไฟล์"

if [ "$FOREVER" = false ]; then
  RUNTIME_SECONDS=$(days_to_seconds $RUNTIME_DAYS)
  echo "⏱️ Container จะทำงานเป็นเวลา $RUNTIME_DAYS วัน ($(printf "%'d" $RUNTIME_SECONDS) วินาที)"
  echo "🕒 หมดเวลาแล้ว container จะถูกหยุดโดยอัตโนมัติ (ไม่มีการแสดงตัวนับเวลา)"
  (sleep $RUNTIME_SECONDS && docker stop $CONTAINER_NAME && echo "🛑 Container หยุดทำงานแล้ว (ครบกำหนดเวลา)") &
fi

echo ""
echo "💡 คำแนะนำ:"
echo "- หากต้องการหยุด container ก่อนเวลา ให้ใช้คำสั่ง: docker stop $CONTAINER_NAME"
echo "- หากต้องการดูบันทึก: docker logs -f $CONTAINER_NAME"
