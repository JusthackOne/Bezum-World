FROM oven/bun:1.3.11 AS deps
WORKDIR /app

COPY package.json bun.lock ./
RUN set -e; \
  for attempt in 1 2 3 4 5; do \
    echo "bun install attempt ${attempt}/5"; \
    if bun install --frozen-lockfile; then \
      exit 0; \
    fi; \
    echo "bun install failed, cleaning cache and retrying..."; \
    rm -rf /root/.bun/install/cache || true; \
    sleep 3; \
  done; \
  echo "bun install failed after 5 attempts"; \
  exit 1

COPY prisma ./prisma
RUN bunx --bun prisma generate

FROM oven/bun:1.3.11 AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM oven/bun:1.3.11 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
COPY seed ./seed
COPY package.json ./package.json

EXPOSE 3000

CMD ["bun", "dist/main.js"]
