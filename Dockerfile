# Multi-stage build optimized สำหรับ pnpm และความเร็ว
# Stage 1: Base - เตรียม pnpm และ tools พื้นฐาน
FROM node:18-alpine AS base

# เปิดใช้งาน pnpm ผ่าน corepack (built-in ใน Node.js 16.13+)
RUN corepack enable pnpm

# ติดตั้ง tools ที่จำเป็น
RUN apk add --no-cache libc6-compat openssl curl

# Stage 2: Dependencies - ติดตั้ง packages
FROM base AS deps
WORKDIR /app

# คัดลอก package.json
COPY package.json ./

# สร้าง pnpm-lock.yaml และติดตั้ง dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Stage 3: Builder - build application
FROM base AS builder
WORKDIR /app

# คัดลอก dependencies จาก deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/pnpm-lock.yaml* ./

# คัดลอก source code
COPY . .

# ตั้งค่า environment สำหรับ build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Generate Prisma client
RUN pnpm dlx prisma generate

# Build application
RUN pnpm build

# Stage 4: Production deps - ติดตั้ง production dependencies เท่านั้น
FROM base AS prod-deps
WORKDIR /app

# คัดลอก package files
COPY package.json ./
COPY --from=deps /app/pnpm-lock.yaml* ./

# ติดตั้งเฉพาะ production dependencies
RUN pnpm install --frozen-lockfile --prod || pnpm install --prod

# Stage 5: Runner - final production image
FROM base AS runner
WORKDIR /app

# สร้าง user ที่ไม่ใช่ root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# ตั้งค่า environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PORT=3000

# คัดลอกไฟล์ที่จำเป็น
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# คัดลอก built application
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# คัดลอก Prisma files
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# เปลี่ยนเป็น non-root user
USER nextjs

# เปิด port
EXPOSE 3000

# Healthcheck - optimized
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
CMD ["pnpm", "start"]