#!/bin/bash

# ลบคอนเทนเนอร์เดิมถ้ามี
docker rm -f vps-first-app-dev || true

# ดึงอิมเมจล่าสุด
docker pull armboy/vps-first-app:dev-latest

# รันคอนเทนเนอร์ใหม่พร้อม environment variables
docker run -d --name vps-first-app-dev \
  -p 3002:3002 \
  -e DATABASE_URL="postgresql://username:password@host:5432/dbname" \
  -e NEXTAUTH_URL="http://yourdomain.com:3002" \
  -e NEXTAUTH_SECRET="your-secret-key-here" \
  -e NODE_ENV="production" \
  armboy/vps-first-app:dev-latest

# แสดงสถานะ
docker ps | grep vps-first-app-dev

echo "เริ่มต้นใช้งานแอพที่พอร์ต 3002 เรียบร้อยแล้ว"
echo "ดูล็อกด้วยคำสั่ง: docker logs vps-first-app-dev -f" 