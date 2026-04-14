FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.7.0 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY packages/ packages/
COPY apps/ apps/

RUN pnpm install --frozen-lockfile

# ---- Builder ----
FROM base AS builder
RUN pnpm run build

# ---- Production ----
FROM node:22-alpine AS runner
WORKDIR /app

COPY --from=builder /app/apps/web/dist ./dist
COPY --from=builder /app/apps/web/package.json ./

ENV NODE_ENV=production
EXPOSE 4173

# Serve static files with a simple server
RUN npm install -g serve
CMD ["serve", "-s", "dist", "-l", "4173"]