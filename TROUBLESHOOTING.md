# 🚨 Production Build Troubleshooting Guide

## ปัญหาที่พบบ่อยและวิธีแก้ไข

### 1. 🐳 Docker Build ล้มเหลว

#### Symptom: "Docker build ล้มเหลว"
```bash
# ตรวจสอบ syntax Dockerfile
docker build --no-cache -t test .

# ตรวจสอบ logs อย่างละเอียด  
docker build --progress=plain --no-cache -t test . 2>&1 | tee build.log
```

**สาเหตุที่พบบ่อย:**
- ไฟล์ Dockerfile syntax ผิด
- Dependencies ใน package.json มีปัญหา
- Network connection ขาดหายใน build step
- พื้นที่ disk เต็ม

**วิธีแก้:**
```bash
# 1. ตรวจสอบพื้นที่
df -h
docker system df

# 2. ลบ unused images
docker image prune -f

# 3. Build แบบ step-by-step
docker build --target deps -t test-deps .
docker build --target builder -t test-builder .
docker build --target runner -t test-runner .
```

### 2. 💾 Database Connection ปัญหา

#### Symptom: "Database ไม่พร้อมใช้งานภายในเวลาที่กำหนด"

```bash
# ตรวจสอบ database container
docker-compose ps db
docker-compose logs db

# ตรวจสอบ network
docker network ls
docker network inspect vps-first-app_mynetwork
```

**วิธีแก้:**
```bash
# 1. Restart database
docker-compose restart db

# 2. ตรวจสอบ environment variables
docker-compose config

# 3. Manual database connection test
docker exec -it db psql -U sa -d PeaTransformer -c "SELECT 1;"
```

### 3. 🌐 Next.js App ไม่เริ่มต้น

#### Symptom: "Next.js App ไม่พร้อมใช้งานภายในเวลาที่กำหนด"

```bash
# ดู logs แบบละเอียด
docker-compose logs -f nextjs-app

# เข้าไปใน container
docker exec -it nextjs-app sh
ls -la
ps aux
```

**สาเหตุที่พบบ่อย:**
- Environment variables ไม่ครบ
- Prisma migration ล้มเหลว
- Port 3000 ถูกใช้งานแล้ว
- Dependencies หาย

**วิธีแก้:**
```bash
# 1. ตรวจสอบ process ใน container
docker exec -it nextjs-app ps aux

# 2. ตรวจสอบ environment
docker exec -it nextjs-app env

# 3. Manual start
docker exec -it nextjs-app sh
cd /app
npm start
```

### 4. 🔄 Rollback ล้มเหลว

#### Symptom: "ไม่สามารถ rollback ได้"

```bash
# Manual rollback
docker-compose down
git checkout HEAD~1 -- docker-compose.yml
docker-compose up -d

# หรือใช้ image เฉพาะ
docker run -d -p 3000:3000 armboy/vps-first-app:280425
```

### 5. 💿 พื้นที่ Disk เต็ม

#### Symptom: "no space left on device"

```bash
# ตรวจสอบพื้นที่
df -h
du -sh /*

# ล้าง Docker
docker system prune -af --volumes
docker image prune -af
docker container prune -f
docker volume prune -f

# ล้าง system logs (macOS)
sudo rm -rf /var/log/*
```

### 6. 🌍 Network Issues

#### Symptom: การเชื่อมต่อ services ล้มเหลว

```bash
# ตรวจสอบ network
docker network ls
docker network inspect vps-first-app_mynetwork

# ทดสอบการเชื่อมต่อ
docker exec -it nextjs-app ping db
docker exec -it nextjs-app nslookup db
```

**วิธีแก้:**
```bash
# สร้าง network ใหม่
docker-compose down
docker network prune -f
docker-compose up -d
```

### 7. 🔐 Permission Issues

#### Symptom: "permission denied"

```bash
# ตรวจสอบ user ใน container
docker exec -it nextjs-app id
docker exec -it nextjs-app ls -la /app

# แก้ไข permissions
docker exec -it --user root nextjs-app chown -R nextjs:nodejs /app
```

## 🛠️ Emergency Commands

### Quick Fix Commands
```bash
# หยุดทุกอย่าง
docker-compose down
docker stop $(docker ps -aq)
docker rm $(docker ps -aq)

# เริ่มใหม่
docker-compose up -d

# Reset network
docker network prune -f

# ลบทุก image
docker rmi $(docker images -q) -f
```

### Health Check Commands
```bash
# ตรวจสอบ services
curl -f http://localhost:3000/api/health
curl -f http://localhost:3001/api/health

# ตรวจสอบ database
docker exec -it db pg_isready -U sa -d PeaTransformer

# ตรวจสอบ logs
docker-compose logs --tail=50 -f
```

### Manual Recovery
```bash
# 1. หยุดทุกอย่าง
docker-compose down --remove-orphans

# 2. ลบ containers
docker container prune -f

# 3. เริ่มเฉพาะ database
docker-compose up -d db

# 4. รอ database ready
sleep 30

# 5. เริ่ม app
docker-compose up -d nextjs-app

# 6. เริ่ม metabase
docker-compose up -d metabase
```

## 📞 การติดต่อและการช่วยเหลือ

### Log Files Locations
- Build logs: `build.log` (ถ้าใช้ `2>&1 | tee build.log`)
- Docker logs: `docker-compose logs`
- System logs: `/var/log/` (Linux) หรือ Console.app (macOS)

### การรายงานปัญหา
1. รัน `./build-production.sh` และเก็บ error message
2. รัน `docker-compose logs` และเก็บ logs
3. รัน `docker system df` และรายงานพื้นที่
4. รายงาน OS และ Docker version

### Diagnostic Script
```bash
#!/bin/bash
echo "=== System Info ==="
uname -a
docker --version
docker-compose --version

echo "=== Disk Space ==="
df -h
docker system df

echo "=== Docker Status ==="
docker ps -a
docker images

echo "=== Network ==="
docker network ls

echo "=== Logs ==="
docker-compose logs --tail=20
``` 