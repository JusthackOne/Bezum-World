# Frontend Blueprint (Next.js)

Minimal, production-ready frontend foundation for the Social RPG project.

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- shadcn/ui + Radix UI primitives
- Zustand (client/UI state)
- TanStack React Query (server state)
- React Hook Form + Zod
- ESLint + Prettier

## Run

```bash
bun install
bun run dev
```

## Quality

```bash
bun run lint
bun run build
```

## Environment

Copy `.env.example` to `.env` and adjust values if needed.

## Blueprint Structure

```text
src/
  app/
    layout.tsx
    page.tsx

  shared/
    ui/
    lib/
    hooks/
    config/
    types/

  features/
    auth/
      ui/
      model/
      api/

  entities/
    user/

  widgets/
    layout/
      header/
      sidebar/

  processes/

  styles/
    globals.css
```

## Notes

- `features/auth` is a stub module with no real auth/business logic.
- React Query demonstrates server-state readiness via local async stub.
- Zustand demonstrates UI-state readiness via local panel toggle state.
