#!/usr/bin/env bash
set -euo pipefail

SSH_KEY="/Users/sakdithat/.ssh/peas3_github_actions"
SSH_USER="peas3"
SSH_HOST="103.117.149.118"
LOCAL_PORT="15432"
REMOTE_HOST="127.0.0.1"
REMOTE_PORT="5432"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "SSH key not found: $SSH_KEY" >&2
  exit 1
fi

echo "Opening PostgreSQL tunnel on 127.0.0.1:${LOCAL_PORT} -> ${REMOTE_HOST}:${REMOTE_PORT} via ${SSH_USER}@${SSH_HOST}"
echo "Keep this terminal open while running npm run dev in another terminal."

exec ssh \
  -N \
  -L "${LOCAL_PORT}:${REMOTE_HOST}:${REMOTE_PORT}" \
  -i "$SSH_KEY" \
  -o ExitOnForwardFailure=yes \
  -o ServerAliveInterval=60 \
  -o ServerAliveCountMax=3 \
  "${SSH_USER}@${SSH_HOST}"
