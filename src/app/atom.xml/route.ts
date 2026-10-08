import { getPosts } from "@/sanity/lib/queries";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://oud-idk.dev";

export const revalidate = 60;

function escapeXml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

export async function GET() {
    const posts = await getPosts();
    const updated = posts[0]?.publishedAt ?? new Date().toISOString();

    const entries = posts
        .map((post) => {
            const url = post.slug ? `${SITE_URL}/blog/${post.slug}` : `${SITE_URL}/blog`;
            return `  <entry>
    <title>${escapeXml(post.title)}</title>
    <link href="${escapeXml(url)}"/>
    <id>${escapeXml(url)}</id>
    <updated>${new Date(post.publishedAt ?? Date.now()).toISOString()}</updated>
    <author><name>${escapeXml(post.author ?? "Dayton Glenn Japaryo")}</name></author>
    ${post.excerpt ? `<summary>${escapeXml(post.excerpt)}</summary>` : ""}
  </entry>`;
        })
        .join("\n");

    const feed = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Dayton Glenn Japaryo</title>
  <link href="${SITE_URL}/"/>
  <link rel="self" type="application/atom+xml" href="${SITE_URL}/atom.xml"/>
  <id>${SITE_URL}/</id>
  <updated>${new Date(updated).toISOString()}</updated>
${entries}
</feed>
`;

    return new Response(feed, {
        headers: {
            "Content-Type": "application/atom+xml; charset=utf-8",
        },
    });
}
