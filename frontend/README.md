# Bezum World Frontend

Next.js application for the Bezum World player and admin interfaces. It includes task feeds, task proof uploads, user profiles, shop and equipment views, battles, leaderboard screens, and admin management pages.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Radix UI and shadcn-style shared components
- Zustand for client/UI state
- TanStack React Query for server state
- React Hook Form and Zod
- Bun

## Local Development

Requirements:

- Bun `>=1.3`
- Backend API available at `http://localhost:3001/api` when using the root Docker setup

Setup:

```bash
cp .env.example .env
bun install
bun run dev
```

The frontend runs on `http://localhost:3000`.

## Production

Production is normally started from the repository root:

```bash
docker compose -f docker-compose.prod.yml up -d --build frontend
```

The production container listens on port `3000` internally. The root production Compose file exposes it on host port `3000`.

Before building production, set `NEXT_PUBLIC_API_BASE_URL` in `frontend/.env.production` to the public backend API URL.

## Environment

Copy `.env.example` to `.env` for local development. Production Compose reads `frontend/.env.production`.

Variables:

- `NEXT_PUBLIC_APP_NAME`: application name shown in the UI
- `NEXT_PUBLIC_API_BASE_URL`: backend API base URL, including `/api`

## Commands

```bash
bun run dev
bun run build
bun run start
bun run lint
bun run format:check
```

