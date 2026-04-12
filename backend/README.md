# Social RPG Backend Blueprint

## Quick start

1. Copy env and set real secrets:

```bash
cp .env.example .env
```

2. Start dependencies:

```bash
docker compose up -d postgres redis
```

3. Install dependencies:

```bash
bun install
```

4. Apply migrations and generate Prisma client:

```bash
bun run prisma:migrate:dev
bun run prisma:generate
```

5. Start app:

```bash
bun run start:dev
```

## Endpoints

- `GET /api/health`
- `POST /api/auth/login/code`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/admin/accounts`
- `GET /api/auth/me`
- Swagger UI: `GET /docs`

## What is included

- NestJS modular blueprint
- `ConfigModule` with env validation
- `PrismaModule` with startup connection
- Redis module with startup ping
- BullMQ root configuration + default queue
- `nestjs-pino` logging
- Global validation, response envelope, and base error filter
- Swagger / OpenAPI documentation
- Code-based authentication (6-char unique auth code)
- Access token + refresh token flow (`httpOnly` cookie for refresh)
- Admin account creation with automatic unique code generation
- Prisma models for `Account` and `AuthCode`
