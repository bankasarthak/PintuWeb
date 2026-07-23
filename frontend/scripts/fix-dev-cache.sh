#!/usr/bin/env bash
# Fix pintu.lvh.me 500 caused by root-owned .next (sudo dev:auth + npm run dev conflict).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Stopping Next.js on ports 80 and 3000..."
for port in 80 3000; do
  if pids=$(lsof -ti:"$port" 2>/dev/null); then
    kill -9 $pids 2>/dev/null || sudo kill -9 $pids
  fi
done

echo "Removing .next cache (may need sudo if dev:auth was run as root)..."
if [[ -d .next ]]; then
  rm -rf .next 2>/dev/null || sudo rm -rf .next
fi

echo "Done. Start ONE dev server:"
echo "  cd $ROOT && sudo npm run dev:auth    # for http://pintu.lvh.me (Telegram login domain)"
echo "Do NOT also run 'npm run dev' on :3000 — they share .next and will break each other."
