# Multi-stage Dockerfile for Next.js standalone + Prisma
FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat openssl curl dumb-init
WORKDIR /app

# Install dependencies once. BuildKit/GitHub Actions persists the npm cache
# between builds, while package-lock.json keeps the install reproducible.
FROM base AS dependencies
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm npm ci

# Keep the migration CLI separate from the application's full dependency tree.
# The final image needs this at startup, but not every UI/build package.
FROM base AS prisma-cli
RUN --mount=type=cache,target=/root/.npm \
    npm install --no-save prisma@5.22.0

FROM base AS builder
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/package*.json ./
COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN --mount=type=cache,target=/app/.next/cache npm run build

FROM base AS runner

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

ARG APP_VERSION=unknown
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV APP_VERSION=${APP_VERSION}

# Prisma migrate is required by docker-entrypoint.sh. Copy its isolated
# dependency tree first, then overlay the smaller traced app runtime.
COPY --from=prisma-cli /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--", "./docker-entrypoint.sh"]
