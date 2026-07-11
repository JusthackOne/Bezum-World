#!/usr/bin/env bash

set -Eeuo pipefail

REPO_URL="${REPO_URL:-}"
APP_DIR="${APP_DIR:-/opt/bezum-world}"
BRANCH="${BRANCH:-main}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
BACKEND_ENV_B64="${BACKEND_ENV_B64:-}"
FRONTEND_ENV_B64="${FRONTEND_ENV_B64:-}"

if [[ -z "$REPO_URL" ]]; then
  echo "ERROR: REPO_URL is required."
  echo "Example:"
  echo "  REPO_URL='https://github.com/<owner>/<repo>.git' bash deploy.sh"
  exit 1
fi

log() {
  printf '\n[%s] %s\n' "$(date +'%Y-%m-%d %H:%M:%S')" "$1"
}

run_sudo() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

install_base_packages() {
  log "Installing base packages"
  run_sudo apt-get update -y
  run_sudo apt-get install -y ca-certificates curl git
}

install_docker_if_missing() {
  if command -v docker >/dev/null 2>&1; then
    log "Docker already installed"
  else
    log "Installing Docker"
    curl -fsSL https://get.docker.com | run_sudo sh
  fi

  if docker compose version >/dev/null 2>&1; then
    log "Docker Compose plugin is available"
  else
    log "Installing Docker Compose plugin"
    run_sudo apt-get install -y docker-compose-plugin
  fi
}

prepare_repo() {
  log "Preparing repository in ${APP_DIR}"
  run_sudo mkdir -p "$APP_DIR"
  run_sudo chown -R "$USER":"$USER" "$APP_DIR"

  if [[ -d "$APP_DIR/.git" ]]; then
    log "Repository exists, updating"
    git -C "$APP_DIR" fetch --all --prune
    git -C "$APP_DIR" checkout "$BRANCH"
    git -C "$APP_DIR" pull --ff-only origin "$BRANCH"
  else
    log "Cloning repository"
    git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
  fi
}

stop_application() {
  log "Stopping application services before build and migrations"
  cd "$APP_DIR"
  docker compose -f "$COMPOSE_FILE" stop backend frontend || true
}

build_stack() {
  log "Building docker images"
  cd "$APP_DIR"
  COMPOSE_PARALLEL_LIMIT=1 docker compose -f "$COMPOSE_FILE" build
}

start_infrastructure() {
  log "Starting database and cache"
  cd "$APP_DIR"
  docker compose -f "$COMPOSE_FILE" up -d postgres redis
}

run_migrations() {
  log "Running backend database migrations"
  cd "$APP_DIR"
  docker compose -f "$COMPOSE_FILE" run --rm --no-deps backend bunx --bun prisma migrate deploy
}

start_stack() {
  log "Starting application stack"
  cd "$APP_DIR"
  COMPOSE_PARALLEL_LIMIT=1 docker compose -f "$COMPOSE_FILE" up -d
  docker compose -f "$COMPOSE_FILE" ps
}

ensure_env_file() {
  local target_file="$1"
  local example_file="$2"

  if [[ -f "$target_file" ]]; then
    log "Using existing env file: ${target_file}"
    return
  fi

  if [[ ! -f "$example_file" ]]; then
    echo "ERROR: Missing env files:"
    echo "  - ${target_file} (not found)"
    echo "  - ${example_file} (template not found)"
    exit 1
  fi

  cp "$example_file" "$target_file"
  log "Created ${target_file} from ${example_file}"
}

write_env_file_from_b64() {
  local target_file="$1"
  local env_b64="$2"

  if [[ -z "$env_b64" ]]; then
    return
  fi

  printf '%s' "$env_b64" | base64 -d > "$target_file"
  chmod 600 "$target_file"
  log "Wrote ${target_file} from deployment secrets"
}

validate_env_placeholders() {
  local env_file="$1"
  local errors=0

  if grep -En '(^|=)(replace-with-[^[:space:]]*|change-this-[^[:space:]]*)' "$env_file" >/dev/null; then
    echo "ERROR: ${env_file} contains placeholder values."
    echo "Please replace all 'replace-with-*' and 'change-this-*' values before deploy."
    errors=1
  fi

  if [[ "$errors" -ne 0 ]]; then
    echo "Failing deployment due to unresolved placeholders in ${env_file}."
    exit 1
  fi
}

prepare_env_files() {
  log "Preparing production env files"
  cd "$APP_DIR"

  if [[ -n "$BACKEND_ENV_B64" ]]; then
    write_env_file_from_b64 "backend/.env.production" "$BACKEND_ENV_B64"
  else
    ensure_env_file "backend/.env.production" "backend/.env.production.example"
  fi

  if [[ -n "$FRONTEND_ENV_B64" ]]; then
    write_env_file_from_b64 "frontend/.env.production" "$FRONTEND_ENV_B64"
  else
    ensure_env_file "frontend/.env.production" "frontend/.env.production.example"
  fi

  validate_env_placeholders "backend/.env.production"
  validate_env_placeholders "frontend/.env.production"
}

print_result() {
  IP_ADDRESS="$(hostname -I | awk '{print $1}')"
  log "Done"
  echo "Frontend: http://${IP_ADDRESS}:3000"
  echo "Backend:  http://${IP_ADDRESS}:3001/api"
}

main() {
  install_base_packages
  install_docker_if_missing
  prepare_repo
  prepare_env_files
  stop_application
  build_stack
  start_infrastructure
  run_migrations
  start_stack
  print_result
}

main "$@"
