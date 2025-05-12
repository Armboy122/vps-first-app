# ใช้ base image เดียว
FROM node:18-alpine

WORKDIR /app

# ติดตั้ง tools ที่จำเป็น
# รวม RUN เดียวกันเพื่อลด layer (อาจเร็วขึ้นเล็กน้อย)
RUN apk add --no-cache libc6-compat openssl && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# ตั้งค่า environment variables
ENV NODE_ENV=production
ARG PORT=3000
ENV PORT=${PORT}
ENV NEXT_TELEMETRY_DISABLED=1
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PRISMA_SKIP_GENERATE=true

# คัดลอกไฟล์ dependencies ก่อน (ยังคงแนะนำเพื่อความเป็นระเบียบ)
COPY package.json package-lock.json* ./

# ติดตั้ง dependencies - ขั้นตอนนี้จะใช้เวลามากที่สุดในครั้งแรก
RUN npm ci --legacy-peer-deps

# คัดลอกโค้ดทั้งหมด (ตรวจสอบ .dockerignore ให้ดี!)
COPY --chown=nextjs:nodejs . .

# Build แอปพลิเคชัน - ขั้นตอนนี้ก็ใช้เวลา
RUN npm run build

# เปลี่ยนเป็น non-root user
USER nextjs

# เปิด Port
EXPOSE ${PORT}

# Healthcheck (ไม่ส่งผลต่อ build time)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/ || exit 0

# คำสั่งเริ่มทำงาน
CMD ["npm", "start"]