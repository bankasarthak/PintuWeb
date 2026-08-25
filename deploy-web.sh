#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# PintuWeb Deploy Script (git-based)
# Usage: ./deploy-web.sh
#
# Deploys this repo (backend API + frontend website) to one EC2 host.
# Override env vars instead of editing this file:
#   PINTUWEB_EC2_HOST      (required)      — e.g. 3.109.55.100
#   PINTUWEB_REMOTE_USER   (default: ec2-user)
#   PINTUWEB_REMOTE_DIR    (default: /home/ec2-user/PintuWeb)
#   PINTUWEB_SSH_KEY       (default: ~/.ssh/pintu.pem)
#   PINTUWEB_BACKEND_SERVICE   (default: pintuweb)
#   PINTUWEB_FRONTEND_SERVICE  (default: pintuweb-frontend)
#
# What it does:
#   1. git pull latest main on EC2
#   2. Backend: pip install any new deps, run DB migrations
#   3. Frontend: npm ci, npm run build
#   4. Restart both systemd services
#   5. Tail logs for 10 s
#
# NOTE: backend/.env and frontend/.env.production.local live only on the
# server (never committed) — edit them directly over SSH when secrets or
# per-host config (domain, bot token, etc.) change.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REMOTE_USER="${PINTUWEB_REMOTE_USER:-ec2-user}"
REMOTE_HOST="${PINTUWEB_EC2_HOST:-}"
REMOTE_DIR="${PINTUWEB_REMOTE_DIR:-/home/ec2-user/PintuWeb}"
SSH_KEY="${PINTUWEB_SSH_KEY:-~/.ssh/pintu.pem}"
BACKEND_SERVICE="${PINTUWEB_BACKEND_SERVICE:-pintuweb}"
FRONTEND_SERVICE="${PINTUWEB_FRONTEND_SERVICE:-pintuweb-frontend}"

if [[ -z "$REMOTE_HOST" ]]; then
  echo "ERROR: Set PINTUWEB_EC2_HOST env var (export PINTUWEB_EC2_HOST=x.x.x.x)"
  exit 1
fi

echo "==> Deploying PintuWeb to $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR"

echo "==> Pulling latest code..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" bash << REMOTE
  set -euo pipefail
  cd "$REMOTE_DIR"
  git pull origin main
REMOTE

echo "==> Backend: installing deps + migrations..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" bash << REMOTE
  set -euo pipefail
  cd "$REMOTE_DIR/backend"
  source .venv/bin/activate
  pip install -q --upgrade pip
  pip install -q -r requirements.txt
  if [[ -f .env ]]; then set -a; source .env; set +a; fi
  for sql_file in migrations/versions/*.sql; do
    [[ -e "\$sql_file" ]] || continue
    echo "    Applying: \$sql_file"
    psql "\$DATABASE_URL" -f "\$sql_file" 2>/dev/null || true
  done
REMOTE

echo "==> Frontend: npm ci + build..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" bash << REMOTE
  set -euo pipefail
  cd "$REMOTE_DIR/frontend"
  npm ci
  npm run build
REMOTE

echo "==> Restarting services..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" \
  "sudo systemctl daemon-reload && sudo systemctl restart $BACKEND_SERVICE $FRONTEND_SERVICE && sudo systemctl status $BACKEND_SERVICE $FRONTEND_SERVICE --no-pager"

echo ""
echo "==> Tailing logs for 10 s..."
ssh -i "$SSH_KEY" "$REMOTE_USER@$REMOTE_HOST" \
  "sudo journalctl -u $BACKEND_SERVICE -u $FRONTEND_SERVICE -f --no-pager -n 30" &
TAIL_PID=$!
sleep 10
kill $TAIL_PID 2>/dev/null || true

echo ""
echo "✅  Deploy complete."
