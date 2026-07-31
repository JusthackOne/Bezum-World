# Implement Civilization Game Mode

## Goal

Integrate an asynchronous, administrator-configured two-team strategy game named Civilization into the existing Social RPG application.

## Requirements

- Add original web-optimized game assets and a stable typed manifest.
- Add normalized Prisma models, constraints, migrations, immutable per-game settings, map snapshots, events, audits, and idempotent reward records.
- Implement authoritative NestJS gameplay, scheduling, concurrency controls, lazy action-point/resource settlement, connectivity, combat, captures, towers, scoring, and rewards.
- Add authenticated player/spectator/history APIs and administrator configuration, validation, lifecycle, map-editing, and audit APIs.
- Add the client and administrator Next.js routes, navigation, PixiJS map/editor, React Query state handling, statistics, actions, history, and read-only historical views.
- Reuse the existing permanent attributes: strength, charisma, endurance, and intelligence; item agility remains an endurance modifier rather than a separate attribute.
- Do not add external gameplay notifications or per-player/per-resource tick jobs.

## Verification

- Validate and generate Prisma Client on the host and in the running backend container.
- Deploy the migration to the local Docker database and restart the backend.
- Run backend unit/integration tests, lint, and build.
- Run frontend lint, TypeScript checking, and production build.
- Verify `/api/health` and authenticated Civilization endpoints against the local Docker backend.
