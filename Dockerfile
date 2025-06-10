# Multi-stage build optimized สำหรับ npm และความเร็ว
# Stage 1: Base - เตรียม tools พื้นฐาน
FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat openssl curl

# Stage 2: Dependencies - ติดตั้ง packages (cache layer สำคัญ)
FROM base AS deps
WORKDIR /app

# คัดลอกเฉพาะ package files ก่อน (cache layer)
COPY package.json package-lock.json* ./

# ใช้ npm ci สำหรับ production build (เร็วกว่า npm install)
RUN npm ci

# Stage 3: Builder - build application
FROM base AS builder
WORKDIR /app

# คัดลอก dependencies จาก deps stage (cache hit ถ้าไม่เปลี่ยน packages)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./

# คัดลอก source code
COPY . .

# ตั้งค่า environment สำหรับ build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Generate Prisma client และ build
RUN npx prisma generate && npm run build

# Stage 4: Production dependencies - ติดตั้งเฉพาะ prod deps
FROM base AS prod-deps
WORKDIR /app

# คัดลอก package files
COPY package.json package-lock.json* ./

# ติดตั้งเฉพาะ production dependencies
RUN npm ci --only=production && npm cache clean --force

# Stage 5: Runner - final production image (เล็กที่สุด)
FROM base AS runner
WORKDIR /app

# สร้าง user ที่ไม่ใช่ root (security)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# ตั้งค่า environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PORT=3000

# คัดลอกเฉพาะที่จำเป็น
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

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

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
CMD ["npm", "start"]