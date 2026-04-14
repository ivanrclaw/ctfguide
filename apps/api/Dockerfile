FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.7.0 --activate
WORKDIR /app

# Copy root workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY packages/ packages/
COPY apps/ apps/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# ---- Builder ----
FROM base AS builder
RUN pnpm run build

# ---- Production ----
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10.7.0 --activate
WORKDIR /app

COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/main.js"]