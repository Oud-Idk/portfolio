import { NextRequest, NextResponse } from "next/server";

import { verifyFileToken } from "@/lib/file-token";
import { isS3Configured, presignDownload, type UploadScope } from "@/lib/s3";

export const runtime = "nodejs";

/**
 * Signed read proxy for private objects.
 *
 * A link is `/api/files/<key>?token=…`; the token binds the key to an expiry.
 * On a match this redirects (302) to a short-lived presigned GET, so the bytes
 * come straight from object storage and never stream through this server.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ key: string[] }> },
) {
    const { key: segments } = await params;
    const key = segments.join("/");

    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authorisedKey = verifyFileToken(token);
    if (!authorisedKey || authorisedKey !== key) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isS3Configured()) {
        return NextResponse.json({ error: "Object storage is not configured." }, { status: 503 });
    }

    try {
        const scope: UploadScope = key.startsWith("media/") ? "media" : "files";
        const url = await presignDownload(key, scope);
        return NextResponse.redirect(url, 302);
    } catch (error) {
        console.error("Failed to presign download:", error);
        return NextResponse.json({ error: "Could not sign the download." }, { status: 500 });
    }
}
