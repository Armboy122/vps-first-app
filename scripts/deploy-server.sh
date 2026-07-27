#!/bin/bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/peas3/vps-first-app}"
ENV_FILE="${ENV_FILE:-.env}"
COMPOSE_FILE="${COMPOSE_FILE:-}"
RUN_DB_SERVICE="${RUN_DB_SERVICE:-true}"
APP_IMAGE_VALUE="${APP_IMAGE:-}"
EXPECTED_APP_VERSION="${EXPECTED_APP_VERSION:-}"
MAX_APP_IMAGE_BYTES="${MAX_APP_IMAGE_BYTES:-600000000}"

cd "$APP_DIR"

if [[ "$ENV_FILE" != /* ]]; then
  ENV_FILE="$APP_DIR/$ENV_FILE"
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"

if [[ "$COMPOSE_FILE" != /* ]]; then
  COMPOSE_FILE="$APP_DIR/$COMPOSE_FILE"
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Missing $COMPOSE_FILE"
  exit 1
fi

APP_PORT="${APP_PORT:-3000}"

if [[ -z "$APP_IMAGE_VALUE" ]]; then
  APP_IMAGE_VALUE="${APP_IMAGE:-}"
fi

export APP_IMAGE="$APP_IMAGE_VALUE"

if [[ -z "${APP_IMAGE:-}" ]]; then
  echo "Missing APP_IMAGE. Set it in the environment or in $ENV_FILE"
  exit 1
fi

compose_cmd=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")

if [[ "${RUN_DB_SERVICE}" == "true" ]]; then
  "${compose_cmd[@]}" up -d db
fi

"${compose_cmd[@]}" pull app

image_size_bytes="$(docker image inspect "$APP_IMAGE" --format '{{.Size}}')"
echo "Pulled $APP_IMAGE (${image_size_bytes} bytes)"

if (( image_size_bytes > MAX_APP_IMAGE_BYTES )); then
  echo "Image exceeds MAX_APP_IMAGE_BYTES=${MAX_APP_IMAGE_BYTES}"
  exit 1
fi

"${compose_cmd[@]}" up -d app

for attempt in {1..45}; do
  health_payload="$(
    curl -fsS "http://127.0.0.1:${APP_PORT}/api/health" 2>/dev/null || true
  )"

  if [[ -n "$health_payload" ]] &&
    {
      [[ -z "$EXPECTED_APP_VERSION" ]] ||
        [[ "$health_payload" == *"\"version\":\"${EXPECTED_APP_VERSION}\""* ]]
    }; then
    docker image prune -f --filter "until=168h" >/dev/null 2>&1 || true
    "${compose_cmd[@]}" ps
    echo "Readiness verified for version ${EXPECTED_APP_VERSION:-unknown}"
    exit 0
  fi

  sleep 3
done

"${compose_cmd[@]}" ps

if [[ "${RUN_DB_SERVICE}" == "true" ]]; then
  "${compose_cmd[@]}" logs --tail=100 app db
else
  "${compose_cmd[@]}" logs --tail=100 app
fi

exit 1
