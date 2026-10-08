import { createHmac, timingSafeEqual } from "crypto";

const MAX_AGE_MS = 5 * 60 * 1000;

/**
 * Verifies a Sanity webhook request. Preferred: the `sanity-webhook-signature`
 * header (HMAC-SHA256 of `${timestamp}.${rawBody}` with the webhook secret).
 * Falls back to a `?secret=` query param for older configs.
 */
export function verifySanityWebhook(
    signatureHeader: string | null,
    querySecret: string | null,
    rawBody: string,
): boolean {
    const secret = process.env.SANITY_WEBHOOK_SECRET;
    if (!secret) return false;

    if (signatureHeader) {
        const parts = Object.fromEntries(
            signatureHeader.split(",").map((p) => p.split("=", 2) as [string, string]),
        );
        const { t, v1 } = parts;
        if (!t || !v1) return false;

        const timestampSec = Number(t);
        if (!Number.isFinite(timestampSec)) return false;
        // Be tolerant about seconds vs milliseconds.
        const timestampMs = timestampSec > 1e12 ? timestampSec : timestampSec * 1000;
        if (Math.abs(Date.now() - timestampMs) > MAX_AGE_MS) {
            return false;
        }

        const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest();
        // Accept the digest as hex, base64, or base64url.
        const candidates = [
            Buffer.from(v1, "hex"),
            Buffer.from(v1, "base64"),
            Buffer.from(v1.replace(/-/g, "+").replace(/_/g, "/"), "base64"),
        ];
        return candidates.some(
            (c) => c.length === expected.length && timingSafeEqual(c, expected),
        );
    }

    return querySecret === secret;
}
