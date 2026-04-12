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