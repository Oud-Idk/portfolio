#!/usr/bin/env bash
# Report *observed* metrics under devtools throttling, which is what a real
# visitor experiences. Lighthouse's default numbers are a Lantern simulation
# and can disagree sharply with the observed trace.
# Usage: scripts/perf-observed.sh [label]
set -euo pipefail

LABEL="${1:-run}"
PORT="${PORT:-3002}"
OUT_DIR="${OUT_DIR:-/tmp/opencode/perf}"

mkdir -p "$OUT_DIR"
CHROME_PATH=/usr/bin/chromium npx --yes lighthouse@12 "http://localhost:${PORT}/" \
  --only-categories=performance \
  --throttling-method=devtools \
  --output=json \
  --output-path="${OUT_DIR}/observed-${LABEL}.json" \
  --chrome-flags='--headless=new --no-sandbox --disable-gpu' \
  --quiet >/dev/null 2>&1

python3 - "$OUT_DIR/observed-${LABEL}.json" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
a, m = d["audits"], d["audits"]["metrics"]["details"]["items"][0]
num = lambda k: a.get(k, {}).get("numericValue", float("nan"))
print(f"  LCP {num('largest-contentful-paint'):.0f}ms"
      f"  FCP {num('first-contentful-paint'):.0f}ms"
      f"  TBT {num('total-blocking-time'):.0f}ms"
      f"  CLS {num('cumulative-layout-shift'):.2f}"
      f"  score {(d.get('categories', {}).get('performance', {}) or {}).get('score', float('nan'))*100:.0f}")
print(f"    observed FCP {m.get('observedFirstContentfulPaint', '?')}ms"
      f"  observed LCP {m.get('observedLargestContentfulPaint', '?')}ms"
      f"  TTFB {m.get('observedTimeOrigin', '?') and m.get('timeToFirstByte', '?')}ms")
for t in a.get("largest-contentful-paint-element", {}).get("details", {}).get("items", []):
    for it in t.get("items", []):
        if "node" in it:
            print(f"    element: {it['node'].get('selector')}")
        elif "phase" in it:
            print(f"    {it['phase']}: {it['timing']:.0f}ms")
PY
