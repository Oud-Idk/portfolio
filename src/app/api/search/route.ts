import { NextRequest, NextResponse } from "next/server";

import { meili, MEILI_INDEX } from "@/lib/meilisearch";

export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const q = searchParams.get("q")?.trim() ?? "";
    const limit = Math.min(Number(searchParams.get("limit") ?? "20") || 20, 50);

    if (!q) {
        return NextResponse.json({ hits: [], hitsPerPage: 0, totalHits: 0 });
    }

    try {
        const result = await meili.index(MEILI_INDEX).search(q, {
            limit,
            attributesToRetrieve: [
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
        return NextResponse.json(result);
    } catch (error) {
        console.error("MeiliSearch query failed:", error);
        return NextResponse.json({ error: "Search unavailable" }, { status: 502 });
    }
}
