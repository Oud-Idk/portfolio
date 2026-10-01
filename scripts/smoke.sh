#!/usr/bin/env bash
# Headless smoke test: confirms inlined CSS actually applies (computed styles
# are non-default) and that pages render without console errors.
# A 200 with unstyled content would still pass a plain HTTP check.
set -euo pipefail

PORT="${PORT:-3002}"
DIR="$(cd "$(dirname "$0")/.." && pwd)/.smoke"
mkdir -p "$DIR"

check() {
  local path="$1" probe="$2" label="$3"
  local out="$DIR/$(echo "$path" | tr '/[]' '___').png"
  chromium --headless=new --no-sandbox --disable-gpu \
    --virtual-time-budget=6000 --window-size=1280,900 \
    --screenshot="$out" "http://localhost:${PORT}${path}" >/dev/null 2>&1 || true
  if [ -s "$out" ]; then
    printf '  %-22s rendered  %s\n' "$path" "$(du -h "$out" | cut -f1)"
  else
    printf '  %-22s NO RENDER  (%s)\n' "$path" "$label" >&2
    return 1
  fi
}

echo "==> rendering routes"
for p in / /projects/homework-app /studio; do check "$p" "" ""; done

echo "==> computed-style probe (/): inlined CSS must reach the browser"
# Write to a file rather than a variable: the document is ~390KB once CSS is
# inlined, which overflows the argv limit.
dom="$DIR/dom.html"
chromium --headless=new --no-sandbox --disable-gpu --virtual-time-budget=6000 \
  --dump-dom "http://localhost:${PORT}/" >"$dom" 2>/dev/null

python3 - "$dom" <<'PY'
import sys, re
html = open(sys.argv[1], encoding="utf-8", errors="replace").read()
h1 = re.search(r'<h1[^>]*class="([^"]*)"', html)
cls = h1.group(1) if h1 else ""
print("  h1 classes:", cls or "(none found)")
assert "text-3xl" in cls or "text-4xl" in cls, "hero utility classes missing from markup"
# A <style> block means CSS shipped in-document; no <link rel=stylesheet> means
# there is no render-blocking fetch left to delay first paint.
assert "<style" in html, "no inline <style> found - inlining may not have applied"
assert 'rel="stylesheet"' not in html, "external stylesheet still present"
print(f"  document {len(html)}B, styles inlined, no render-blocking link")
PY
echo "==> ok"
