# Fix Frontend Local Tooling

## Goal

Make the Next.js frontend start reliably with Bun on Windows and provide repeatable commands for
Tailwind-aware formatting, linting, auto-fixing, and production build verification.

## Requirements

- Run the locally installed Next.js CLI through `bun run` without routing its absolute Windows path
  through `bunx` or forcing the Bun runtime for Next.js.
- Report non-canonical Tailwind CSS v4 utilities through ESLint.
- Automatically fix canonical Tailwind utilities and sort class lists where safe.
- Provide one command for all style auto-fixes.
- Provide one non-destructive command for ESLint, formatting checks, and the production build.
- Document the new frontend commands.

## Verification

- Start the development server locally.
- Run the Tailwind-aware style fix command.
- Run the combined frontend check command.
- Inspect the affected application at desktop and mobile viewport sizes with Playwright.
