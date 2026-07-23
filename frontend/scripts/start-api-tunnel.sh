#!/usr/bin/env bash
# Forward local :8000 → prod pintuweb on EC2 (required for local / pintu.lvh.me dev).
set -euo pipefail

KEY="${PINTU_SSH_KEY:-$HOME/Downloads/MrPintu.pem}"
HOST="${PINTU_V3_EC2_HOST:-ec2-user@13.233.154.123}"

if lsof -tiTCP:8000 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port 8000 already in use (tunnel may be running)."
  curl -sf -o /dev/null -w "API health: HTTP %{http_code}\n" http://localhost:8000/docs || true
  exit 0
fi

echo "Starting SSH tunnel localhost:8000 → ${HOST}:8000 ..."
ssh -i "$KEY" -o StrictHostKeyChecking=no -f -N \
  -L 8000:127.0.0.1:8000 \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  -o ExitOnForwardFailure=yes \
  "$HOST"

sleep 1
curl -sf -o /dev/null -w "API tunnel OK: HTTP %{http_code}\n" http://localhost:8000/docs
echo "Keep this tunnel running while developing locally."
