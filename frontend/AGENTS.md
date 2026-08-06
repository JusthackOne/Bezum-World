# Frontend Agent Rules

## Scope

- This file applies to all files inside `frontend/`.
- Root `AGENTS.md` rules are still mandatory. This file adds frontend-specific rules.

## Tech Stack (Current Project)

- Next.js App Router (`src/app`)
- TypeScript (strict mode)
- Tailwind CSS + shadcn/ui
- Zustand for local UI/client state
- TanStack React Query for server state
- Axios HTTP clients (`adminHttpClient`, `clientHttpClient`)

## Architecture Boundaries

- Keep modular structure: `app`, `features`, `entities`, `shared`, `widgets`, `processes`.
- `app/*`:
  - Route composition only (pages/layouts/route-level wiring).
  - No data-fetching business logic directly in route files if it can live in feature hooks/components.
- `features/*`:
  - Feature-specific UI, API hooks/requests, and local model types.
- `entities/*`:
  - Reusable domain-level primitives (types, small domain UI blocks).
- `shared/*`:
  - Cross-feature utilities, base UI components, configs, HTTP helpers.
  - Any helper, hook, formatter, parser, or model that is not inherently tied to one domain must be placed in `src/shared` from the start, not inside a feature or entity.
  - Before finishing a frontend change, audit newly added helpers and move reusable project-wide code into the appropriate `shared/lib`, `shared/hooks`, `shared/model`, or `shared/config` module.
- `widgets/*`:
  - Composed UI blocks that combine multiple features/entities.

## State Management Rules

- Server state (remote data) must be handled via React Query.
- Client/UI-only state must be handled via Zustand or local React state.
- Do not store remote API payloads in Zustand unless there is a proven UX requirement and clear invalidation strategy.

## API Layer Rules

- Do not call axios directly from React components.
- All HTTP calls must live in `features/*/api/requests`.
- Use shared response wrapper helper for envelope and error handling:
  - `src/shared/lib/api-request.ts` (`requestApiData`)
- Use typed request/response models. Avoid `any`.
- Always `encodeURIComponent` dynamic path segments.
- Keep fallback error messages explicit and user-readable.

## Endpoints and URLs

- Keep feature API paths in one place per feature:
  - preferred: `features/<feature>/api/endpoints.ts`
- Use endpoint builders for dynamic segments:
  - `profile: (username) => \`/users/${encodeURIComponent(username)}\``
- Keep frontend route builders in one place per feature when reused:
  - preferred: `features/<feature>/routes.ts`
- Do not scatter hardcoded URL strings across multiple files.

## Query Rules (React Query)

- Query keys must be centralized in `src/shared/config/query-keys.ts`.
- Feature hooks should use stable query keys and typed request functions.
- Handle all three states in UI:
  - pending/loading
  - error
  - success/empty data
- Do not duplicate fetching logic in multiple components if a feature hook already exists.

## Forms and Validation

- Use `react-hook-form` + `zod` for forms.
- Validate user input at form boundary (before request call).
- Keep form schema near form component unless reused by multiple forms.

## UI Rules

- Use shadcn/ui components from `src/shared/ui` as base primitives.
- Use Tailwind utility classes for layout and styling.
- Custom CSS is allowed only for game-specific visual components (cards/items/effects/battle UI).
- Build responsive UI by default (mobile first).
- Keep loading/error/empty states explicit and informative.

## Re-export and Imports

- Every feature sublayer directory should expose public members via `index.ts`.
- `index.ts` files must contain exports only (no runtime logic).
- Prefer importing from layer barrels (example: `@/features/auth/ui`) over deep internal paths, except when avoiding circular dependencies.

## TypeScript Rules

- Strict typing only; avoid `any`.
- Keep DTO/API response types separate from UI-specific mapped types when needed.
- Prefer explicit return types on exported functions in API/model layers.
- Narrow `unknown` values before usage.

## Next.js App Router Rules

- Keep route params typed explicitly.
- Use `async` route pages only when needed.
- Put interactive logic in client components (`"use client"`), keep server components lean.
- Do not move backend business rules to frontend.

## File/Change Discipline

- Keep changes minimal and task-focused.
- Do not refactor unrelated modules in the same task.
- Preserve existing naming/style patterns unless there is a clear project-wide reason to change.
- No hidden side effects.

## Optional Quality Checks

- Do not automatically run Prettier, lint, type-check, or production build after changes.
- Run these checks only when the user explicitly requests them.

## Do

- Follow existing project architecture and naming.
- Reuse shared helpers before creating new utilities.
- Keep code production-ready and readable.

## Do NOT

- Do not duplicate API error handling boilerplate per request.
- Do not place business logic in route files or UI primitives.
- Do not invent missing backend fields silently.
- Do not introduce global patterns without updating shared docs/configs.
