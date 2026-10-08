import { Meilisearch } from "meilisearch";

export const MEILI_HOST = process.env.MEILISEARCH_HOST ?? "http://127.0.0.1:7700";
export const MEILI_API_KEY = process.env.MEILISEARCH_API_KEY ?? process.env.MEILI_MASTER_KEY ?? "";
export const MEILI_INDEX = process.env.MEILISEARCH_INDEX ?? "posts";

export const meili = new Meilisearch({
    host: MEILI_HOST,
    apiKey: MEILI_API_KEY,
});

export interface BlogSearchDocument {
    id: string;
    title: string;
    slug?: string;
    excerpt?: string;
    tags?: string[];
    author?: string;
    publishedAt?: string;
    featured?: boolean;
    content?: string;
}

export async function ensureIndexSettings() {
    const index = meili.index(MEILI_INDEX);
    await index.updateSettings({
        searchableAttributes: ["title", "excerpt", "tags", "author", "content"],
        filterableAttributes: ["tags", "featured", "author"],
        sortableAttributes: ["publishedAt"],
        displayedAttributes: ["id", "title", "slug", "excerpt", "tags", "author", "publishedAt", "featured"],
    });
    return index;
}
