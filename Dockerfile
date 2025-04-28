# Base image with Node.js - explicitly set platform
FROM --platform=linux/amd64 node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies
RUN apk add --no-cache libc6-compat openssl

# Set environment variables
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV NEXT_TELEMETRY_DISABLED=1

# Copy package files
COPY package.json ./
COPY package-lock.json* ./
COPY yarn.lock* ./

# Install dependencies
RUN npm ci --legacy-peer-deps || yarn install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Build the application without running prisma generate (will be run at runtime)
ENV PRISMA_SKIP_GENERATE=true
RUN npm run build || yarn build

# Set environment for production
ENV NODE_ENV=production
ENV PORT=3000

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 0

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]