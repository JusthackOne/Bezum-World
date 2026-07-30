# Project: Social RPG (Tasks + Battles + Progression)

## Overview
This project is a social RPG where users gain XP from real-life tasks, improve stats, collect items, and compete with friends in offline battles and weekly seasons.

Core mechanics:
- task completion → XP, currency, stats
- player progression (levels, stats, items)
- offline PvP battles (auto-resolved)
- anti-abuse validation
- weekly leaderboard and events

---

## Tech Stack

### Frontend
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zustand (state management)
- Tanstack React Query (server state)

### Backend
- NestJS
- TypeScript
- REST + WebSocket (for events if needed)

### Data
- PostgreSQL
- Redis (cache, rate limit, queues)

### Database schema workflow
- Every change to `backend/prisma/schema.prisma` must include a matching Prisma migration in `backend/prisma/migrations/`.
- After changing the Prisma schema, regenerate the Prisma Client in the host backend environment.
- If the local backend from `docker-compose.local.yml` is running, the agent must also:
  1. regenerate the Prisma Client inside the backend container;
  2. apply pending migrations to the local Docker database;
  3. restart the backend container;
  4. verify `/api/health` and the affected API endpoint.
- Use these commands for the running local Docker environment:
  - `docker compose -f docker-compose.local.yml exec -T backend bun run prisma:generate`
  - `docker compose -f docker-compose.local.yml exec -T backend bunx --bun prisma migrate deploy`
  - `docker compose -f docker-compose.local.yml restart backend`
- If the local containers are unavailable, report that the Docker migration/client refresh was not performed and provide the exact commands required. Do not silently skip this workflow.

---

## Architecture

### General
- Follow modular architecture
- Keep layers separated

### Backend rules
- controllers must be thin
- business logic must be in services
- DB access only via repositories
- no logic in DTOs
- validation is mandatory for all input

### Frontend rules
- separate UI state and server state
- do not duplicate backend business logic
- use Zustand only for client state
- use React Query for server data

## Coding Rules

### General
- keep code explicit and simple
- avoid hidden side effects
- prefer small functions
- no over-engineering

### TypeScript
- avoid `any`
- use strict typing
- separate DTO and domain models

### NestJS
- use services for logic
- use modules per domain
- use DTO validation

### Naming
- clear and descriptive names
- no abbreviations without meaning

---

## API Rules

- always return structured JSON
- never break response format
- include error handling
- validate all incoming data

---

## UI Rules

- use shadcn/ui as base
- use Tailwind for layout
- use canonical Tailwind CSS v4 utility classes whenever an equivalent utility exists
- treat `tailwindcss(suggestCanonicalClasses)` diagnostics in changed code as errors and resolve them before finishing
- prefer theme utilities and spacing-scale utilities over arbitrary values; use arbitrary values only when no exact canonical utility exists
- custom CSS only for game-specific components:
  - cards
  - items
  - effects
  - battle UI

---

## Do

- follow existing architecture
- keep changes minimal and focused
- write production-ready code
- consider edge cases
- think about scalability

---

## Do NOT

- do not move logic to frontend
- do not write business logic in controllers
- do not ignore validation
- do not refactor unrelated code
- do not invent missing fields silently

---

## Git and Commit Rules

- Use Conventional Commits with the format `type(scope): imperative summary`.
- Keep each commit focused on one logical change.
- Before committing, review the staged diff and stage only files or hunks related to the requested change.
- Preserve unrelated tracked and untracked changes in the working tree.
- When the user asks to commit changes, create a local commit only.
- Do not push, open or update a pull request, publish a branch, or perform any other remote Git action unless the user explicitly requests it.
- Do not amend, squash, rebase, or otherwise rewrite existing commits unless the user explicitly requests it.

---

## Task Files Rules

- Every new task must be created in the `tasks/` directory.
- Every new task must be written in English.

---

## Output Format (for agent responses)

When generating code or solutions:

1. problem
2. solution
3. code
4. risks

---

## Key Principle

The agent must act as a strict engineering assistant:
- prioritize correctness over creativity
- follow rules over assumptions
- generate clean, maintainable code
