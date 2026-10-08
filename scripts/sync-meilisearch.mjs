/**
 * Full re-index of all blog posts from Sanity into MeiliSearch.
 *
 * Usage:
 *   pnpm search:sync
 *
 * Requires MEILISEARCH_HOST, MEILISEARCH_API_KEY and NEXT_PUBLIC_SANITY_* in
 * env (loads .env.local / .env automatically when present).
 */
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "next-sanity";
import { Meilisearch } from "meilisearch";

for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
}

const sanity = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
    apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-01-01",
    useCdn: false,
    token: process.env.SANITY_API_TOKEN,
});

const meili = new Meilisearch({
    host: process.env.MEILISEARCH_HOST ?? "http://127.0.0.1:7700",
    apiKey: process.env.MEILISEARCH_API_KEY ?? process.env.MEILI_MASTER_KEY ?? "",
});

const INDEX = process.env.MEILISEARCH_INDEX ?? "posts";

const POSTS_FOR_INDEX = `*[_type == "post"] {
  _id,
  title,
  "slug": slug.current,
  excerpt,
  tags,
  author,
  publishedAt,
  featured,
  content
}`;

/** Lightweight markdown -> plain text for search indexing. */
function stripMarkdown(md) {
    if (!md) return "";
    return md
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/`[^`]*`/g, " ")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
        .replace(/\[[^\]]*\]\([^)]*\)/g, " ")
        .replace(/[#>*_~|-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

async function main() {
    const posts = await sanity.fetch(POSTS_FOR_INDEX);
    console.log(`Fetched ${posts.length} posts from Sanity`);

    const index = meili.index(INDEX);
    const task = await index.updateSettings({
        searchableAttributes: ["title", "excerpt", "tags", "author", "content"],
        filterableAttributes: ["tags", "featured", "author"],
        sortableAttributes: ["publishedAt"],
        displayedAttributes: [
            "id",
            "title",
            "slug",
            "excerpt",
            "tags",
            "author",
            "publishedAt",
            "featured",
        ],
    });
    await meili.tasks.waitForTask(task.taskUid);

    const docs = posts.map((p) => ({
        id: p._id,
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        tags: p.tags ?? [],
        author: p.author,
        publishedAt: p.publishedAt,
        featured: p.featured ?? false,
        content: stripMarkdown(p.content),
    }));

    const addTask = await index.addDocuments(docs);
    await meili.tasks.waitForTask(addTask.taskUid);
    console.log(`Indexed ${docs.length} documents into "${INDEX}"`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
