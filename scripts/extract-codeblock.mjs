// Extract the first syntax-highlighted code block from two running servers and
// render each in a minimal page carrying that server's own CSS, so the two can
// be compared as images. Diagnostics only.
import http from "node:http";

const get = (port, path) =>
  new Promise((resolve, reject) => {
    http
      .get({ host: "127.0.0.1", port, path, headers: { "accept-encoding": "identity" } }, (r) => {
        const c = [];
        r.on("data", (d) => c.push(d));
        r.on("end", () => resolve(Buffer.concat(c).toString("utf8")));
      })
      .on("error", reject);
  });

const cssOf = (html) => {
  const blocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
  return blocks.join("\n");
};

const bodyOf = (html) => {
  const m = html.match(/<body[^>]*>([\s\S]*)<\/body>/);
  return m ? m[1] : "";
};

const stripScripts = (s) => s.replace(/<script[\s\S]*?<\/script>/g, "");

// The CodeBlock wrapper is the div that carries the language header + <pre>.
const firstCodeBlock = (html) => {
  const clean = stripScripts(bodyOf(html));
  const i = clean.indexOf("<pre");
  if (i === -1) return null;
  const start = clean.lastIndexOf("<div", i);
  return clean.slice(start === -1 ? i : start, clean.indexOf("</pre>", i) + 6);
};

const port = process.argv[2] ?? "3002";
const path = process.argv[3] ?? "/projects/homework-app";
const html = await get(Number(port), path);
const block = firstCodeBlock(html);
if (!block) {
  console.error("no code block found on", port, path);
  process.exit(1);
}
const page = `<!doctype html><html><head><meta charset="utf-8"><style>
${cssOf(html)}
body{background:#fff;padding:24px}
</style></head><body>${block}</body></html>`;
process.stdout.write(page);
