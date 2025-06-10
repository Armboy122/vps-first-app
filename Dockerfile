# Multi-stage build สำหรับ production optimization
# Stage 1: Dependencies
FROM node:18-alpine AS deps
WORKDIR /app

# ติดตั้ง tools ที่จำเป็นสำหรับ build
RUN apk add --no-cache libc6-compat openssl

# คัดลอกไฟล์ package เพื่อใช้ cache layer
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./

# ติดตั้ง dependencies ตาม package manager ที่มี
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Stage 2: Builder
FROM node:18-alpine AS builder
WORKDIR /app

# คัดลอก dependencies จาก stage แรก
COPY --from=deps /app/node_modules ./node_modules

# คัดลอกโค้ดทั้งหมด
COPY . .

# ตั้งค่า environment variables สำหรับ build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Generate Prisma client ก่อน build
RUN npx prisma generate

# Build แอปพลิเคชัน
RUN yarn build

# Stage 3: Runner (Production)
FROM node:18-alpine AS runner
WORKDIR /app

# ติดตั้ง tools ที่จำเป็นสำหรับ production
RUN apk add --no-cache libc6-compat openssl curl

# สร้าง user ที่ไม่ใช่ root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# ตั้งค่า environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PUPPETEER_SKIP_DOWNLOAD=true

# คัดลอกไฟล์ที่จำเป็น
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# คัดลอก .next/standalone ถ้ามี (Next.js standalone output)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# คัดลอก Prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# เปลี่ยนเป็น non-root user
USER nextjs

# เปิด Port
EXPOSE 3000
ENV PORT=3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# คำสั่งเริ่มทำงาน
CMD ["node", "server.js"]