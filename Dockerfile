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
# คัดลอก build dependencies
COPY --from=build-deps /app/node_modules ./node_modules
COPY --from=build-deps /app/package*.json ./

# คัดลอก source code ทั้งหมด
COPY . .

# Environment variables สำหรับ build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Generate Prisma client และ build Next.js standalone
RUN npx prisma generate && npm run build

# Stage 5: Runner - Production image ที่เล็กที่สุด
FROM base AS runner

# สร้าง non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
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

# เปลี่ยนเป็น non-root user
USER nextjs

# เปิด port
EXPOSE 3000

# Health check (เร็วขึ้น)
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/api/health',{timeout:2000}).then(r=>r.ok||process.exit(1)).catch(()=>process.exit(1))"

# ใช้ dumb-init สำหรับ proper signal handling และ Next.js standalone
CMD ["dumb-init", "node", "server.js"]