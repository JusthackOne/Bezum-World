# Bezum World

Bezum World is a social RPG where real-life tasks, character progression, items, and asynchronous battles are connected into one game loop. Users complete tasks for rewards, grow their stats, collect equipment, battle other players once per day, and compete through score-driven progression.

## Technology Stack

- Frontend: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Radix UI, shadcn-style components, Zustand, TanStack React Query
- Backend: NestJS 11, TypeScript, REST API, Swagger/OpenAPI, Prisma ORM, BullMQ
- Data: PostgreSQL 17, Redis 8
- Runtime and tooling: Bun 1.3, Docker Compose, ESLint, Prettier

## Project Structure

```text
.
+-- backend/              # NestJS API, Prisma schema, migrations, uploads
+-- frontend/             # Next.js client and admin UI
+-- docker-compose.yml    # Local full-stack Docker setup
`-- docker-compose.prod.yml
```

## Local Development

Requirements:

- Bun `>=1.3`
- Docker Desktop or Docker Engine with Compose v2

Start PostgreSQL and Redis from the repository root:

```bash
docker compose up -d postgres redis
```

Prepare the backend:

```bash
cd backend
cp .env.example .env
bun install
bun run prisma:generate
bun run prisma:migrate:dev
bun run dev
```

Prepare the frontend in a second terminal:

```bash
cd frontend
cp .env.example .env
bun install
bun run dev
```

Local URLs:

- Frontend: `http://localhost:3000`
- Backend API health: `http://localhost:3001/api/health`
- Swagger docs: `http://localhost:3001/docs`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

To run the full local stack in Docker instead:

```bash
docker compose up -d --build
```

Stop local Docker services:

```bash
docker compose down
```

Remove local Docker volumes as well:

```bash
docker compose down -v
```

## Production

Production is intended to run through `docker-compose.prod.yml` with environment files from:

- `backend/.env.production`
- `frontend/.env.production`

Before starting production, set real values for secrets, public hostnames, and API URLs in those files. Do not reuse development secrets in a public deployment.

Build and start the full production stack from the repository root:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Run database migrations against the production database:

```bash
docker compose -f docker-compose.prod.yml exec backend bunx --bun prisma migrate deploy
```

Optional production seed:

```bash
docker compose -f docker-compose.prod.yml exec backend bun run prisma:seed
```

Stop production services:

```bash
docker compose -f docker-compose.prod.yml down
```

Production service ports:

- Frontend: `3000`
- Backend API: `3001`
- Backend API health: `/api/health`
- Swagger docs: `/docs`

## Useful Commands

Install dependencies:

```bash
make install
```

Run quality checks:

```bash
make lint
make build
```

Backend commands:

```bash
cd backend
bun run lint
bun run build
bun run prisma:migrate:dev
bun run prisma:studio
```

Frontend commands:

```bash
cd frontend
bun run lint
bun run build
```

## Environment Files

Use `.env.example` files as development templates:

- `backend/.env.example`
- `frontend/.env.example`

Production Compose reads:

- `backend/.env.production`
- `frontend/.env.production`

Keep production secrets outside version control in real deployments.

## Screenshots

Add screenshots here.
