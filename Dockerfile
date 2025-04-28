# syntax=docker/dockerfile:1.4
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Add common dependencies in base to improve caching
RUN apk add --no-cache libc6-compat openssl

# เพิ่มตรงนี้เพื่อแก้ปัญหา puppeteer
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies only when needed
FROM base AS deps

# Copy only package files to leverage layer caching
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./

# Install dependencies with cache mount for node_modules
RUN --mount=type=cache,target=/root/.npm \
    if [ -f yarn.lock ]; then \
      yarn --frozen-lockfile; \
    elif [ -f package-lock.json ]; then \
      npm ci --legacy-peer-deps; \
    elif [ -f pnpm-lock.yaml ]; then \
      yarn global add pnpm && pnpm i --frozen-lockfile; \
    else \
      echo "Lockfile not found." && exit 1; \
    fi

# Build the application
FROM base AS builder

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy only necessary files for build
COPY package.json .
COPY prisma ./prisma
COPY tsconfig*.json ./
COPY next.config.js ./
COPY public ./public
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY styles ./styles
COPY middleware.ts ./
COPY next-env.d.ts ./

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js app with cache mount
RUN --mount=type=cache,target=/app/.next/cache \
    yarn build

# Production image
FROM base AS runner

ENV NODE_ENV=production

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy build output from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./

# Switch to non-root user
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Set proper env vars
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]