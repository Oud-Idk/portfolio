# syntax=docker/dockerfile:1

# ---------- deps ----------
# Installed in their own stage so `npm ci` is cached independently of source edits.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- builder ----------
FROM node:22-alpine AS builder
WORKDIR /app

# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so they
# must be present here. SANITY_API_TOKEN is server-only and is re-supplied at
# runtime by docker compose; it is deliberately not baked into the build args.
ARG NEXT_PUBLIC_SANITY_PROJECT_ID
ARG NEXT_PUBLIC_SANITY_DATASET
ARG NEXT_PUBLIC_SANITY_API_VERSION
# Read at module scope in layout.tsx to build metadataBase, so it is baked into
# the prerendered HTML and cannot be supplied at runtime.
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SANITY_PROJECT_ID=$NEXT_PUBLIC_SANITY_PROJECT_ID \
    NEXT_PUBLIC_SANITY_DATASET=$NEXT_PUBLIC_SANITY_DATASET \
    NEXT_PUBLIC_SANITY_API_VERSION=$NEXT_PUBLIC_SANITY_API_VERSION \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# next.config.ts is TypeScript; Next compiles it in-process, no extra build step.
RUN npm run build

# ---------- runner ----------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs \
    && adduser -u 1001 -S nextjs -G nodejs

# `output: "standalone"` bundles a minimal server plus only the traced deps.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# static assets and public files are not part of the standalone trace.
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

# Uses node's fetch, so no curl/wget needs installing into the image.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
