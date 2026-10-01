// Enumerate every code block on a page and report which ones actually got
// tokenized. A block with 0 tokens is rendered unstyled, which is what
// "highlighting is missing" looks like.
// Usage: node scripts/audit-codeblocks.mjs <port> <path>
const port = Number(process.argv[2] ?? 3002);
const path = process.argv[3] ?? "/projects/homework-app";

const html = await (
  await fetch(`http://localhost:${port}${path}`, { headers: { "accept-encoding": "identity" } })
).text();

const pres = [...html.matchAll(/<pre[^>]*>([\s\S]*?)<\/pre>/g)];
if (!pres.length) {
  console.log("  (no <pre> elements found)");
  process.exit(0);
}

let bad = 0;
pres.forEach((m, i) => {
  const inner = m[1];
  const tokens = (inner.match(/class="token/g) ?? []).length;
  // The fence language lives on the inner <code class="language-...">.
  const lang = /class="[^"]*language-([^\s"]+)/.exec(inner)?.[1] ?? "(none)";
  const text = inner
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 46);
  const ok = tokens > 0;
  if (!ok) bad++;
  console.log(
    `  ${ok ? "ok  " : "FAIL"} block ${String(i).padStart(2)}  lang=${lang.padEnd(12)} tokens=${String(tokens).padStart(3)}  ${text}`,
  );
});
console.log(`  -> ${pres.length - bad}/${pres.length} highlighted`);
