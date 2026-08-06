# Moscow Scheduling and UTC Storage

## Goal

Use Moscow calendar boundaries for backend daily and weekly game processes while storing every
timestamp as a UTC instant in PostgreSQL.

## Requirements

- Use `@date-fns/tz` with `Europe/Moscow` for backend calendar calculations.
- Reset daily battle and task limits at 00:00 Moscow time.
- Reset weekly task limits on Monday at 00:00 Moscow time.
- Process task suggestions daily at 00:00 Moscow time.
- Keep the Telegram daily digest scheduled at 00:00 Moscow time.
- Store timestamp fields as PostgreSQL `timestamptz(3)` values; keep calendar-only fields as `DATE`.
- Serialize API timestamps as ISO 8601 UTC values so the frontend can format them in the user's
  local time zone.

## Verification

- Add focused tests for Moscow day, week, and date-key boundaries.
- Run backend tests, build, lint, and Prisma validation.
- Regenerate Prisma Client and deploy the migration to the local Docker database when available.
- Restart the backend and verify health and an affected endpoint.
