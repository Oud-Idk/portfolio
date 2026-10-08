import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { client } from "@/sanity/lib/client";
import { meili, MEILI_INDEX } from "@/lib/meilisearch";

const POST_FOR_INDEX = `*[_type == "post" && _id == $id][0] {
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

function stripMarkdown(md?: string): string {
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

/**
 * Sanity webhook receiver: keeps the MeiliSearch index in sync with post
 * create/update/delete, and revalidates the Next.js cache for post/project
 * changes. Configure the webhook URL as
 *   https://<site>/api/webhooks/sanity?secret=$SANITY_WEBHOOK_SECRET
 * with triggers on create, update and delete of types "post" and "project".
 */
export async function POST(request: NextRequest) {
    const secret = request.nextUrl.searchParams.get("secret");
    if (!process.env.SANITY_WEBHOOK_SECRET || secret !== process.env.SANITY_WEBHOOK_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { _id?: string; id?: string; _type?: string; slug?: string | { current?: string } };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const slug = typeof body.slug === "string" ? body.slug : body.slug?.current;
    const id = body._id ?? body.id;
    if (!id) {
        return NextResponse.json({ ok: true, skipped: true });
    }

    if (body._type === "project") {
        revalidateTag("projects", "max");
        if (slug) revalidateTag(`project:${slug}`, "max");
        return NextResponse.json({ ok: true, revalidated: id });
    }

    if (body._type && body._type !== "post") {
        return NextResponse.json({ ok: true, skipped: true });
    }

    revalidateTag("posts", "max");
    if (slug) revalidateTag(`post:${slug}`, "max");

    try {
        const post = await client.fetch(POST_FOR_INDEX, { id }, { cache: "no-store" });
        const index = meili.index(MEILI_INDEX);

        if (!post) {
            await index.deleteDocument(id);
            return NextResponse.json({ ok: true, deleted: id });
        }

        if (post.slug) revalidateTag(`post:${post.slug}`, "max");

        await index.addDocuments([
            {
                id: post._id,
                title: post.title,
                slug: post.slug,
                excerpt: post.excerpt,
                tags: post.tags ?? [],
                author: post.author,
                publishedAt: post.publishedAt,
                featured: post.featured ?? false,
                content: stripMarkdown(post.content),
            },
        ]);
        return NextResponse.json({ ok: true, indexed: id });
    } catch (error) {
        console.error("Webhook reindex failed:", error);
        return NextResponse.json({ error: "Reindex failed" }, { status: 500 });
    }
}
