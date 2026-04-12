# Social RPG Backend Blueprint

## Quick start

1. Copy env:

```bash
cp .env.example .env
```

2. Start dependencies:

```bash
docker compose up -d postgres redis
```

3. Install and generate Prisma client:

```bash
bun install
bun run prisma:generate
```

4. Start app:

```bash
bun run start:dev
```

## Endpoints

- `GET /api/health`
- `GET /api/auth/status`

## What is included

- NestJS modular blueprint
- `ConfigModule` with env validation
- `PrismaModule` with startup connection
- Redis module with startup ping
- BullMQ root configuration + default queue
- `nestjs-pino` logging
- Global validation, response envelope, and base error filter
- `auth` stub module (placeholder only)
