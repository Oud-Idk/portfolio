import fs from "node:fs/promises";
import { createClient } from "@sanity/client";

const raw = await fs.readFile(".env.local", "utf8");
const env = {};
for (const line of raw.split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const client = createClient({
    projectId: env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: env.NEXT_PUBLIC_SANITY_DATASET || "production",
    apiVersion: env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-01-01",
    token: env.SANITY_API_TOKEN,
    useCdn: false,
});

try {
    const me = await client.request({ uri: "/users/me", tag: "verify" });
    console.log("authenticated as :", me.email ?? me.id);
} catch (e) {
    console.log("AUTH FAILED:", e.status ?? "", e.message?.slice(0, 120));
    process.exit(1);
}
const before = await client.fetch(`*[_type == "project"]{_id, "slug": slug.current}`);
console.log("project docs now :", before.length, JSON.stringify(before));
