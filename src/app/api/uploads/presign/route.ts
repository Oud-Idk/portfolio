import { NextRequest, NextResponse } from "next/server";

import {
    ACCESS_JWT_HEADER,
    isAccessConfigured,
    verifyAccessToken,
} from "@/lib/cloudflare-access";
import {
    buildKey,
    isS3Configured,
    presignUpload,
    privateBucketIsShared,
    validateUpload,
    type UploadScope,
} from "@/lib/s3";

export const runtime = "nodejs";

interface PresignBody {
    filename?: unknown;
    contentType?: unknown;
    size?: unknown;
    scope?: unknown;
}

/**
 * Mints a presigned PUT so the browser uploads straight to object storage. The
 * file never passes through this server — which is the point, since the media
 * it carries is video.
 *
 * The caller is the site owner, identified by a Cloudflare Access token they
 * never see or hold: Cloudflare attaches it when the request passes the Access
 * policy, and we verify it before signing anything.
 *
 * The client must send back exactly the `headers` we return (they are part of
 * the signature), so the declared content type is the one that lands on the
 * object. Size is checked here on the client's word: a presigned PUT can't cap
 * bytes, so the Access policy is the real limit on who can push.
 */
export async function POST(request: NextRequest) {
    if (!isAccessConfigured()) {
        return NextResponse.json(
            { error: "Uploads are not configured (Cloudflare Access)." },
            { status: 503 },
        );
    }

    const identity = await verifyAccessToken(request.headers.get(ACCESS_JWT_HEADER));
    if (!identity) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isS3Configured()) {
        return NextResponse.json({ error: "Object storage is not configured." }, { status: 503 });
    }

    let body: PresignBody;
    try {
        body = (await request.json()) as PresignBody;
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { filename, contentType, size, scope } = body;

    if (scope !== "media" && scope !== "files") {
        return NextResponse.json(
            { error: 'scope must be "media" or "files"' },
            { status: 400 },
        );
    }
    if (typeof filename !== "string" || !filename.trim()) {
        return NextResponse.json({ error: "filename is required" }, { status: 400 });
    }
    if (typeof contentType !== "string" || !contentType.trim()) {
        return NextResponse.json({ error: "contentType is required" }, { status: 400 });
    }
    if (typeof size !== "number") {
        return NextResponse.json({ error: "size (bytes) is required" }, { status: 400 });
    }

    const validation = validateUpload(scope as UploadScope, contentType, size);
    if (!validation.ok) {
        return NextResponse.json({ error: validation.error }, { status: 422 });
    }

    if (scope === "files" && privateBucketIsShared()) {
        console.warn(
            "Uploading a private file into the media bucket: set S3_PRIVATE_BUCKET, " +
                "or 'files/' objects are readable by anyone with the public URL.",
        );
    }

    try {
        const result = await presignUpload({
            scope: scope as UploadScope,
            key: buildKey(scope as UploadScope, filename),
            contentType,
        });
        return NextResponse.json(result);
    } catch (error) {
        console.error("Failed to presign upload:", error);
        return NextResponse.json({ error: "Could not sign the upload." }, { status: 500 });
    }
}
