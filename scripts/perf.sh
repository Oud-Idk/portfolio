#!/usr/bin/env bash
# Measure LCP on the local release build, N times, and report the median.
# Usage: scripts/perf.sh [runs] [label]
set -euo pipefail

RUNS="${1:-3}"
LABEL="${2:-run}"
OUT_DIR="${OUT_DIR:-/tmp/opencode/perf}"
PORT="${PORT:-3002}"
URL="http://localhost:${PORT}/"

mkdir -p "$OUT_DIR"
echo "==> $LABEL: $RUNS mobile-profile runs against $URL"

for i in $(seq 1 "$RUNS"); do
  CHROME_PATH=/usr/bin/chromium npx --yes lighthouse@12 "$URL" \
    --only-categories=performance \
    --output=json \
    --output-path="${OUT_DIR}/${LABEL}-${i}.json" \
    --chrome-flags='--headless=new --no-sandbox --disable-gpu' \
    --quiet >/dev/null 2>&1
  printf '  run %s done\n' "$i"
done

python3 - "$OUT_DIR" "$LABEL" <<'PY'
import json, sys, glob, statistics
out_dir, label = sys.argv[1], sys.argv[2]
rows = []
for path in sorted(glob.glob(f"{out_dir}/{label}-*.json")):
    d = json.load(open(path))
    a = d["audits"]
    m = a["metrics"]["details"]["items"][0]
    rows.append({
        "lcp": a["largest-contentful-paint"]["numericValue"],
        "fcp": a["first-contentful-paint"]["numericValue"],
        "tbt": a["total-blocking-time"]["numericValue"],
        "cls": a["cumulative-layout-shift"]["numericValue"],
        "tti": a["interactive"]["numericValue"],
        "bytes": m.get("totalByteWeight", 0),
        "score": d["categories"]["performance"]["score"],
    })
    phases = {}
    for t in a.get("largest-contentful-paint-element", {}).get("details", {}).get("items", []):
        for it in t.get("items", []):
            if "phase" in it:
                phases[it["phase"]] = it["timing"]
    rows[-1]["render_delay"] = phases.get("Render Delay", 0)
    rows[-1]["ttfb"] = phases.get("TTFB", 0)

med = lambda k: statistics.median([r[k] for r in rows])
print(f"\n  {'metric':<14}{'median':>10}   runs")
for k, labeltxt in [("lcp","LCP"),("fcp","FCP"),("render_delay","  render delay"),
                    ("ttfb","  TTFB"),("tbt","TBT"),("cls","CLS"),
                    ("tti","TTI"),("bytes","bytes")]:
    vals = ", ".join(f"{r[k]:.0f}" for r in rows)
    print(f"  {labeltxt:<14}{med(k):>10.0f}   [{vals}]")
print(f"  {'perf score':<14}{med('score')*100:>9.0f}")
PY
