import { NextRequest, NextResponse } from "next/server";

import {
    ACCESS_JWT_HEADER,
    accessLogoutUrl,
    isAccessConfigured,
    verifyAccessToken,
} from "@/lib/cloudflare-access";

export const runtime = "nodejs";

/**
 * Who the browser is, according to Cloudflare Access. The uploader surfaces use
 * it to show that they are authenticated, and to tell a misconfigured policy
 * (page reachable, API not) apart from a working one.
 */
export async function GET(request: NextRequest) {
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

    return NextResponse.json({ email: identity.email, logoutUrl: accessLogoutUrl() });
}
