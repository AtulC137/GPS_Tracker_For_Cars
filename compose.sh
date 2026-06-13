#!/usr/bin/env sh
# Docker Compose wrapper — loads backend and frontend .env files.
# Usage: ./compose.sh up --build
#        ./compose.sh up-phone-mqtt
#        ./compose.sh ps
#        ./compose.sh logs core

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

ENV_FILES="--env-file $ROOT/backend/.env --env-file $ROOT/frontend/gps-tracker-for-cars/.env"

case "${1:-}" in
  up-phone-mqtt)
    shift
    exec docker compose $ENV_FILES --profile phone --profile mqtt up -d --build "$@"
    ;;
  ps)
    shift
    exec docker compose $ENV_FILES ps "$@"
    ;;
  logs)
    if [ "${2:-}" = "core" ]; then
      shift 2
      exec docker compose $ENV_FILES logs postgres backend frontend "$@"
    fi
    shift
    exec docker compose $ENV_FILES logs "$@"
    ;;
  *)
    exec docker compose $ENV_FILES "$@"
    ;;
esac
