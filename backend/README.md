# Bezum World Backend

NestJS API for Bezum World. It handles authentication, users, tasks, task submissions with proof images, items, equipment, battles, rewards, leaderboards, uploads, and admin operations.

## Stack

- NestJS 11
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis
- BullMQ
- JWT authentication with refresh-token cookies
- Swagger/OpenAPI
- Bun

## Local Development

Requirements:

- Bun `>=1.3`
- PostgreSQL and Redis. From the repository root, run `docker compose up -d postgres redis`.

Setup:

```bash
cp .env.example .env
bun install
bun run prisma:generate
bun run prisma:migrate:dev
bun run dev
```

The backend runs on `http://localhost:3001` with the default local `.env.example`. In production Docker it listens on port `3000` inside the container and is exposed on host port `3001` by the root Compose file.

Useful local URLs:

- API health: `/api/health`
- Swagger docs: `/docs`
- Uploaded files: `/uploads/*`

## Production

Production is normally started from the repository root:

```bash
docker compose -f docker-compose.prod.yml up -d --build backend
```

Apply migrations:

```bash
docker compose -f docker-compose.prod.yml exec backend bunx --bun prisma migrate deploy
```

Optional seed:

```bash
docker compose -f docker-compose.prod.yml exec backend bun run prisma:seed
```

The production container listens on port `3000` internally. The root production Compose file exposes it on host port `3001`.

## Environment

Copy `.env.example` to `.env` for local development. Production Compose reads `backend/.env.production`.

Important variables:

- `APP_DOMAIN`: public backend domain used for generated asset URLs
- `DATABASE_URL`: PostgreSQL connection URL
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB`, `REDIS_PASSWORD`: Redis connection
- `AUTH_JWT_ACCESS_SECRET`, `AUTH_JWT_REFRESH_SECRET`: JWT secrets
- `AUTH_ADMIN_USERNAME`, `AUTH_ADMIN_PASSWORD`: initial admin credentials
- `AUTH_REFRESH_COOKIE_SECURE`: set to `true` when serving over HTTPS
- `SEED_ENV`: optional seed mode, for example `prod` or `test`

## Commands

```bash
bun run dev
bun run build
bun run lint
bun run prisma:generate
bun run prisma:migrate:dev
bun run prisma:studio
bun run prisma:seed
```
