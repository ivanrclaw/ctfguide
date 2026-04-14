# ---- Stage 1: Build everything ----
FROM node:22-bookworm AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.7.0 --activate

WORKDIR /app

# Copy workspace root files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY packages/ packages/

# Copy app source code
COPY apps/api/ apps/api/
COPY apps/web/ apps/web/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build shared package first, then all apps
RUN pnpm run build

# Prune dev dependencies to reduce image size
RUN pnpm prune --prod

# ---- Stage 2: Production ----
FROM node:22-bookworm

# Install PostgreSQL
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/cache/apt/*

WORKDIR /app

# Copy entire built workspace (symlinks preserved, devDeps pruned)
COPY --from=builder /app/ ./

# Rebuild bcrypt for this Node ABI (native module!)
RUN cd apps/api && npm rebuild bcrypt 2>/dev/null || npm rebuild

# Copy built frontend as the 'client' directory relative to the API
# The API serves static files from dist/../client = apps/api/client
COPY --from=builder /app/apps/web/dist ./apps/api/client

# Copy entrypoint script
COPY docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Environment defaults
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_HOST=127.0.0.1
ENV DB_PORT=5432
ENV DB_USERNAME=ctfguide
ENV DB_PASSWORD=ctfguide_pwd
ENV DB_DATABASE=ctfguide
ENV DATA_DIR=/data

# Data volume for PostgreSQL + uploads
VOLUME ["/data"]

EXPOSE 3001

WORKDIR /app/apps/api

ENTRYPOINT ["/app/entrypoint.sh"]