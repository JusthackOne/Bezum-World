#!/usr/bin/env bash

set -Eeuo pipefail

REPO_URL="${REPO_URL:-}"
APP_DIR="${APP_DIR:-/opt/bezum-world}"
BRANCH="${BRANCH:-main}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"

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

start_stack() {
  log "Starting docker stack"
  cd "$APP_DIR"
  docker compose -f "$COMPOSE_FILE" up -d --build
  docker compose -f "$COMPOSE_FILE" ps
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
  start_stack
  print_result
}

main "$@"
