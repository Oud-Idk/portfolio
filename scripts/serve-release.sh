#!/usr/bin/env bash
# Rebuild the release bundle and (re)start it on PORT, replacing any server
# already holding that port. Use this instead of `npm run build` + `npm start`
# so a stale server never serves the previous build.
set -euo pipefail

PORT="${PORT:-3002}"
cd "$(dirname "$0")/.."

echo "==> building"
npm run build

echo "==> stopping anything on :${PORT}"
# Match the listening socket's owning process, not just the npm wrapper.
pids=$(ss -ltnpH "sport = :${PORT}" 2>/dev/null \
  | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u || true)
for pid in $pids; do
  kill "$pid" 2>/dev/null || true
done
sleep 1

echo "==> starting release server on :${PORT}"
nohup npm run start -- -p "$PORT" >"/tmp/opencode/server-${PORT}.log" 2>&1 &

for _ in $(seq 1 30); do
  if curl -fsS -o /dev/null "http://localhost:${PORT}/" 2>/dev/null; then
    echo "==> ready: http://localhost:${PORT}/"
    exit 0
  fi
  sleep 0.5
done

echo "==> server failed to come up; log follows" >&2
tail -20 "/tmp/opencode/server-${PORT}.log" >&2
exit 1
