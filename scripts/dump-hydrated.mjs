// Dumps a code block's DOM after client JS has run, so we can tell a
// server-render problem apart from one introduced during hydration.
// Usage: node scripts/dump-hydrated.mjs <port> <path> [selector]
import { spawn } from "node:child_process";
import net from "node:net";

const port = Number(process.argv[2] ?? 3002);
const path = process.argv[3] ?? "/projects/homework-app";
const wanted = process.argv[4] ?? "pre";

const freePort = await new Promise((res) => {
  const s = net.createServer();
  s.listen(0, () => {
    const p = s.address().port;
    s.close(() => res(p));
  });
});

const chrome = spawn("chromium", [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  `--remote-debugging-port=${freePort}`,
  "--user-data-dir=/tmp/opencode/cdp-profile",
  "about:blank",
]);
chrome.stderr.on("data", () => {});

const waitForCdp = async () => {
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${freePort}/json/version`);
      if (r.ok) return (await r.json()).webSocketDebuggerUrl;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("devtools never came up");
};

const wsUrl = await waitForCdp();
const { WebSocket } = await import("node:worker_threads").then(() => globalThis);
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));

let id = 0;
const pending = new Map();
ws.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});
const send = (method, params = {}, sessionId) =>
  new Promise((res) => {
    const n = ++id;
    pending.set(n, res);
    ws.send(JSON.stringify({ id: n, method, params, sessionId }));
  });

const { result: target } = await send("Target.createTarget", { url: "about:blank" });
const { result: attach } = await send("Target.attachToTarget", {
  targetId: target.targetId,
  flatten: true,
});
const s = attach.sessionId;

await send("Page.enable", {}, s);
await send("Runtime.enable", {}, s);
await send("Page.navigate", { url: `http://localhost:${port}${path}` }, s);
// Give the client bundle time to hydrate.
await new Promise((r) => setTimeout(r, 6000));

const expr = `(() => {
  const el = document.querySelector(${JSON.stringify(wanted)});
  if (!el) return JSON.stringify({ found: false });
  const wrap = el.closest('div.relative') || el.parentElement;
  return JSON.stringify({
    found: true,
    preLen: el.outerHTML.length,
    tokens: el.querySelectorAll('span.token').length,
    tokenColors: [...el.querySelectorAll('span.token')].slice(0,6).map(s => s.getAttribute('style')),
    wrapperClass: wrap ? wrap.className : null,
    headerText: wrap ? (wrap.querySelector('span')||{}).textContent : null,
  });
})()`;
const { result } = await send(
  "Runtime.evaluate",
  { expression: expr, returnByValue: true },
  s,
);
console.log(result.result.value ?? JSON.stringify(result));

ws.close();
chrome.kill();
