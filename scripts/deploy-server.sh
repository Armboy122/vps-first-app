#!/bin/bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/peas3/vps-first-app}"
APP_PORT="${APP_PORT:-3000}"
APP_IMAGE_VALUE="${APP_IMAGE:-}"

cd "$APP_DIR"

if [[ ! -f .env ]]; then
  echo "Missing $APP_DIR/.env"
  exit 1
fi

if [[ -z "$APP_IMAGE_VALUE" ]]; then
  APP_IMAGE_VALUE="$(grep -E '^APP_IMAGE=' .env | tail -n 1 | cut -d '=' -f 2- || true)"
fi

if [[ -z "$APP_IMAGE_VALUE" ]]; then
  echo "Missing APP_IMAGE. Set it in the environment or in $APP_DIR/.env"
  exit 1
fi

export APP_IMAGE="$APP_IMAGE_VALUE"

docker rm -f nextjs-app nextjs-app-uat metabase db >/dev/null 2>&1 || true
docker compose up -d db
docker compose pull app
docker compose up -d app
docker image prune -f >/dev/null 2>&1 || true

for attempt in {1..45}; do
  if curl -fsS "http://127.0.0.1:${APP_PORT}/api/health" >/dev/null 2>&1; then
    docker compose ps
    exit 0
  fi

  sleep 3
done

docker compose ps
docker compose logs --tail=100 app db
exit 1
