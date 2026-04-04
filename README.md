# VPS First App

Next.js app ที่รันบน VPS แบบเรียบง่าย:

- `peas3.shop` -> `Caddy` -> `app` (`127.0.0.1:3000`)
- `app` -> `Postgres` ผ่าน Docker network (`db`)
- บนเครื่องมีแค่ 2 services: `app` และ `db`

## Files สำคัญ

- `docker-compose.yml` ใช้รัน production ทั้งหมด
- `Dockerfile` image สำหรับแอพ
- `docker-entrypoint.sh` รัน Prisma migrate ก่อน start app
- `.env.example` ตัวอย่าง env สำหรับ VPS
- `scripts/deploy-server.sh` deploy script ตัวเดียวสำหรับสั่งมือและ CI
- `.github/workflows/deploy.yml` auto deploy เมื่อ push เข้า `main`
- `ops/caddy/peas3.shop.caddyfile` block ของ Caddy สำหรับ domain นี้

## การตั้งค่า VPS ครั้งแรก

1. clone repo ไปไว้ที่ `/home/peas3/vps-first-app`
2. สร้าง `.env` จาก `.env.example`
3. ตั้งค่า Caddy ให้ `peas3.shop` reverse proxy ไป `127.0.0.1:3000`
4. login GHCR หนึ่งครั้งถ้าจะ deploy เองจาก VPS:

```bash
docker login ghcr.io
```

5. รัน:

```bash
chmod +x scripts/deploy-server.sh
./scripts/deploy-server.sh
```

## ตัวอย่าง `.env`

```env
APP_PORT=3000
DB_PORT=5432
APP_IMAGE=ghcr.io/armboy122/vps-first-app:latest
POSTGRES_DB=PeaTransformer
POSTGRES_USER=sa
POSTGRES_PASSWORD=change-this-db-password
DATABASE_URL=postgresql://sa:change-this-db-password@db:5432/PeaTransformer?schema=public
NEXTAUTH_SECRET=change-this-nextauth-secret
NEXTAUTH_URL=https://peas3.shop
NEXT_PUBLIC_GENERATE_PDF=https://script.google.com/macros/s/AKfycbzMlQp7F8jI9v3nN1PSkV_laJ8BY66vLAheexB120jO5o7n8O8X0otZlHGCenOESvN61Q/exec
```

## การเข้า DB จากเครื่องตัวเอง

อย่าเปิด `5432` ออก public internet

ใช้ SSH tunnel แทน:

```bash
ssh -L 5432:127.0.0.1:5432 peas3@103.117.149.118
```

จากนั้นให้ DBeaver หรือ TablePlus ต่อไปที่:

- host: `127.0.0.1`
- port: `5432`
- database / username / password: ตามค่าใน `.env`

## การรัน Local ด้วย DB บน VPS

TablePlus ต่อได้เพราะมันสร้าง SSH tunnel ให้เอง แต่ `next dev` บนเครื่องคุณจะไม่ใช้ tunnel ของ TablePlus อัตโนมัติ

ถ้าจะรัน local แล้วใช้ DB บน VPS ให้ทำ 2 อย่าง:

1. เปิด SSH tunnel ค้างไว้ใน terminal อีกหน้าต่างหนึ่ง

```bash
ssh -N -L 15432:127.0.0.1:5432 -i ~/.ssh/peas3_github_actions peas3@103.117.149.118
```

2. สร้าง `.env.local` จาก `.env.local.example`

```bash
cp .env.local.example .env.local
```

แล้วแก้ `DATABASE_URL` ใน `.env.local` ให้เป็น:

```env
DATABASE_URL="postgresql://sa:<POSTGRES_PASSWORD>@127.0.0.1:15432/PeaTransformer?schema=public"
```

หลังจากนั้นค่อยรัน:

```bash
npm run dev
```

หมายเหตุ:

- ห้ามใช้ host เป็น `103.117.149.118:5432` ตรง ๆ เพราะ public port ถูกปิดไว้แล้ว
- ห้ามใช้ host เป็น `db` เพราะชื่อ `db` ใช้ได้เฉพาะใน Docker network บน VPS
- ถ้าจะใช้ prod DB จาก local จริง ๆ ระวังคำสั่งที่เขียนข้อมูล เช่น seed, migrate, delete, bulk update

## Auto Deploy

เมื่อ push เข้า branch `main`, GitHub Actions จะทำตามลำดับนี้:

```bash
docker build -t ghcr.io/armboy122/vps-first-app:sha-<commit> .
docker push ghcr.io/armboy122/vps-first-app:sha-<commit>
docker push ghcr.io/armboy122/vps-first-app:latest
scp docker-compose.yml และ scripts/deploy-server.sh ไปที่ VPS
ssh VPS
./scripts/deploy-server.sh
```

### GitHub Secrets ที่ต้องใส่

- `VPS_SSH_KEY`

`deploy-server.sh` จะใช้ `APP_IMAGE` ที่ workflow ส่งเข้าไป ทำให้ VPS ไม่ต้อง build image เองแล้ว
และไม่ต้อง `git pull` บนเซิร์ฟเวอร์ทุก deploy

## Rollback แบบเร็ว

ถ้าต้อง rollback แบบ manual บน VPS ให้เปลี่ยน `APP_IMAGE` ชั่วคราวแล้วรัน deploy:

```bash
export APP_IMAGE=ghcr.io/armboy122/vps-first-app:sha-<commit>
./scripts/deploy-server.sh
```

## หมายเหตุ

- service เก่าอย่าง `metabase`, `dev`, `uat/test` ถูกถอดออกจาก flow แล้ว
- app และ db bind ที่ `127.0.0.1` เพื่อบังคับให้เข้าใช้งานผ่าน Caddy หรือ SSH tunnel เท่านั้น
