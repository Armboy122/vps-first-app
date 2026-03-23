# Ultra-Fast Multi-stage Dockerfile สำหรับ Next.js + Prisma
# Stage 1: Base - ติดตั้ง dependencies พื้นฐาน
FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat openssl curl dumb-init
WORKDIR /app

# Stage 2: Production Dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# Stage 3: Build Dependencies
FROM base AS build-deps
COPY package.json package-lock.json* ./
RUN npm ci && npm cache clean --force

# Stage 4: Builder - build application และ generate Prisma
FROM base AS builder

# Environment variables สำหรับ build (ย้ายขึ้นมาก่อน)
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PUPPETEER_SKIP_DOWNLOAD=true

# คัดลอก build dependencies
COPY --from=build-deps /app/node_modules ./node_modules
COPY --from=build-deps /app/package*.json ./

# คัดลอก Prisma schema ก่อน (เพื่อให้ cache ทำงาน)
COPY prisma ./prisma

# Generate Prisma client ก่อน (เพื่อให้ cache ทำงาน)
RUN npx prisma generate

# คัดลอก source code ทั้งหมด (layer นี้จะ rebuild เมื่อโค้ดเปลี่ยน)
COPY . .

# Build Next.js
RUN npm run build

# Stage 5: Runner - Production image ที่เล็กที่สุด
FROM base AS runner

# สร้าง non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# คัดลอกเฉพาะ production dependencies
COPY --from=deps /app/node_modules ./node_modules

# คัดลอกเฉพาะไฟล์ที่จำเป็นสำหรับ Next.js standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# คัดลอก Prisma client ที่ generate แล้ว
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh

# เปลี่ยนเป็น non-root user
USER nextjs

# เปิด port
EXPOSE 3000

# ใช้ dumb-init สำหรับ proper signal handling และ Prisma migrate ก่อน start
ENTRYPOINT ["dumb-init", "--", "./docker-entrypoint.sh"]
