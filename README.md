# Bezum World

Social RPG: tasks -> XP/currency/stats, progression, offline PvP battles, weekly leaderboard/events.

## Stack

- Frontend: Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, Zustand, React Query
- Backend: NestJS, TypeScript, REST
- Data: PostgreSQL, Redis
- Runtime/package manager: Bun

## Project Structure

```text
.
├─ frontend/
├─ backend/
└─ docker-compose.yml
```

## Run All Services via Docker

Requirements:
- Docker Desktop (or Docker Engine with Compose v2)

From repository root:

```bash
docker compose up -d --build
```

Services:
- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:3001/api/health`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

Stop:

```bash
docker compose down
```

Stop and remove volumes:

```bash
docker compose down -v
```

## Local Development (Bun)

Requirements:
- Bun `>=1.3`

Backend:

```bash
cd backend
cp .env.example .env
bun install
bun run prisma:generate
bun run start:dev
```

Frontend:

```bash
cd frontend
bun install
bun run dev
```

Default local URLs:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001/api/health`

## Useful Commands

Backend:

```bash
cd backend
bun run build
bun run lint
bun run prisma:migrate:dev
```

Frontend:

```bash
cd frontend
bun run build
bun run lint
```
