# CTF Guide

SaaS platform for creating user guides oriented to CTFs (Capture The Flag competitions).

## Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Frontend**: React 19 + Vite 6 + TypeScript + shadcn/ui + Tailwind CSS v4
- **Backend**: NestJS 11 + TypeORM + SQLite
- **Deployment**: Docker Compose, Fly.io

## Project Structure

```
ctfguide/
├── apps/
│   ├── web/          # React frontend (Vite + shadcn)
│   └── api/          # NestJS backend API
├── packages/
│   ├── shared/       # Shared TypeScript types
│   └── tsconfig/     # Shared TypeScript configs
├── docker-compose.yml
└── turbo.json
```

## Quick Start

### Development

```bash
# Install dependencies
pnpm install

# Run all apps in dev mode
pnpm dev

# Build all apps
pnpm build
```

The frontend runs on http://localhost:5173 and the API on http://localhost:3001.

### Production (Docker Compose)

```bash
# Copy environment variables
cp .env.example .env

# Build and run
docker compose up --build

# Access:
# Frontend: http://localhost:4173
# API:      http://localhost:3001/api/health
# Database: localhost:5432
```

### Environment Variables

See `.env.example` for all available configuration options.

## License

MIT