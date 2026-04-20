.PHONY: install install-frontend install-backend dev-frontend dev-backend lint lint-frontend lint-backend build build-frontend build-backend docker-up docker-down docker-up-full docker-up-prod docker-down-prod docker-up-full-prod

install: install-frontend install-backend

install-frontend:
	cd frontend && bun install

install-backend:
	cd backend && bun install

dev-frontend:
	cd frontend && bun run dev

dev-backend:
	cd backend && bun run start:dev

lint: lint-frontend lint-backend

lint-frontend:
	cd frontend && bun run lint

lint-backend:
	cd backend && bun run lint

build: build-frontend build-backend

build-frontend:
	cd frontend && bun run build

build-backend:
	cd backend && bun run build

docker-up:
	docker compose up -d postgres redis

docker-down:
	docker compose down

docker-up-full:
	docker compose up -d --build

docker-up-prod:
	docker compose -f docker-compose.prod.yml up -d postgres redis

docker-down-prod:
	docker compose -f docker-compose.prod.yml down

docker-up-full-prod:
	docker compose -f docker-compose.prod.yml up -d --build
