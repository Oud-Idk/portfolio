import { NextRequest, NextResponse } from "next/server";

import {
    ACCESS_JWT_HEADER,
    isAccessConfigured,
    verifyAccessToken,
} from "@/lib/cloudflare-access";
import { createFileToken, DEFAULT_FILE_TOKEN_TTL_SECONDS } from "@/lib/file-token";
import { isS3Configured } from "@/lib/s3";

export const runtime = "nodejs";

/** A key we minted looks like `scope/YYYY-MM/<id>-<name>`; reject anything else. */
const KEY_PATTERN = /^(media|files)\/[0-9]{4}-[0-9]{2}\/[A-Za-z0-9._-]+$/;

/**
 * Mints a signed, expiring link to a private object. Minting requires the
 * Cloudflare Access identity; *using* the link does not, which is the point —
 * it can be handed to someone with no account at all.
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

    let body: { key?: unknown; ttlSeconds?: unknown };
    try {
        body = (await request.json()) as { key?: unknown; ttlSeconds?: unknown };
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { key, ttlSeconds } = body;
    if (typeof key !== "string" || !KEY_PATTERN.test(key)) {
        return NextResponse.json({ error: "Invalid key" }, { status: 400 });
    }

    const ttl =
        typeof ttlSeconds === "number" && Number.isFinite(ttlSeconds)
            ? ttlSeconds
            : DEFAULT_FILE_TOKEN_TTL_SECONDS;

    const token = createFileToken(key, ttl);
    if (!token) {
        return NextResponse.json({ error: "FILE_LINK_SECRET is not set." }, { status: 503 });
    }

    return NextResponse.json({ url: `/api/files/${key}?token=${token}` });
}
