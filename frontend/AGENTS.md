# Frontend Agent Rules

## Scope
- This file applies to all files inside `frontend/`.

## Architecture
- Keep modular structure (`app`, `features`, `entities`, `shared`, `widgets`, `processes`).
- Separate UI state (Zustand) and server state (React Query).
- Do not duplicate backend business logic in frontend code.

## Re-export Rule
- Every feature sublayer directory must have an `index.ts` for re-exports.
- Use `index.ts` only to re-export public members from files in the same directory.
- Do not place runtime/business logic in `index.ts`.
- Prefer imports from directory barrels (for example `@/features/auth/ui`) instead of deep file paths when possible.

## Coding Rules
- Use strict TypeScript, no `any`.
- Keep functions explicit and focused.
- Keep changes minimal and scoped to the task.
