install:
	bun install

dev:
	bun run start:dev

build:
	bun run build

lint:
	bun run lint

format:
	bun run format

prisma-generate:
	bun run prisma:generate

prisma-migrate:
	bun run prisma:migrate:dev

docker-up:
	docker compose -f ../docker-compose.yml up -d postgres redis

docker-down:
	docker compose -f ../docker-compose.yml down

docker-up-full:
	docker compose -f ../docker-compose.yml up -d --build
