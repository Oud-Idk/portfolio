// Measurement proxy: serves the release build with selected CSS rules stripped
// from the inlined <style> block, so the cost of that CSS can be isolated
// without a rebuild. Diagnostics only — never shipped.
import http from "node:http";
import zlib from "node:zlib";

const UPSTREAM = { host: "127.0.0.1", port: Number(process.env.UPSTREAM_PORT ?? 3002) };
const LISTEN = Number(process.env.LISTEN_PORT ?? 3003);
const STRIP = process.env.STRIP ?? "katex"; // katex | prose | none

const strip = (css) => {
  if (STRIP === "none") return css;
  const rules = css.match(/@font-face\{[^}]*\}|[^{}]*\{[^{}]*\}/g) ?? [];
  const keep = rules.filter((r) => {
    const isKatex = /katex/i.test(r);
    const isProse = STRIP === "prose" && /\.prose/.test(r);
    return !(isKatex || isProse);
  });
  return keep.join("");
};

http
  .createServer((req, res) => {
    const proxy = http.request(
      {
        ...UPSTREAM,
        path: req.url,
        method: req.method,
        // Ask upstream for identity: we rewrite the body, so passing through a
        // gzipped payload (and its content-encoding) would corrupt the output.
        headers: { ...req.headers, "accept-encoding": "identity" },
      },
      (up) => {
        if (!req.url.startsWith("/") || req.url.includes(".")) {
          res.writeHead(up.statusCode ?? 200, up.headers);
          return up.pipe(res);
        }
        const chunks = [];
        up.on("data", (c) => chunks.push(c));
        up.on("end", () => {
          let html = Buffer.concat(chunks).toString("utf8");
          const before = html.length;
          html = html.replace(
            /<style([^>]*)>([\s\S]*?)<\/style>/g,
            (_m, attrs, css) => `<style${attrs}>${strip(css)}</style>`,
          );
          const raw = Buffer.from(html);
          // Re-compress so the measured bytes are comparable to the real
          // server, which gzips; otherwise the stripped build just looks
          // slower for shipping an uncompressed body.
          const wantsGzip = /\bgzip\b/.test(req.headers["accept-encoding"] ?? "");
          const out = wantsGzip ? zlib.gzipSync(raw) : raw;
          const headers = { ...up.headers };
          delete headers["content-encoding"];
          res.writeHead(up.statusCode ?? 200, {
            ...headers,
            ...(wantsGzip ? { "content-encoding": "gzip" } : {}),
            "content-length": out.length,
          });
          console.error(
            `[${STRIP}] ${req.url} raw ${before}B -> ${raw.length}B` +
              `${wantsGzip ? `  gzip ${out.length}B` : ""}`,
          );
          res.end(out);
        });
      },
    );
    proxy.on("error", (e) => {
      res.writeHead(502);
      res.end(String(e));
    });
    proxy.end();
  })
  .listen(LISTEN, () => console.error(`strip=${STRIP} on :${LISTEN} -> :${UPSTREAM.port}`));
