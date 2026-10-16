import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed, expiring links to private objects.
 *
 * Private files are never given a public URL; they are read through
 * `/api/files/<key>?token=…`, which verifies the token before redirecting to a
 * short-lived presigned GET. The token binds the key to an expiry with an HMAC,
 * so a link can be shared without handing over a credential or a long-lived
 * URL. Modelled on `unsubscribe-token.ts`.
 *
 * Server-only: this secret signs links, it does not gate anything, and it never
 * reaches a browser.
 *
 * Fails closed: with no secret configured, nothing verifies.
 */

/** Long enough to share a file, short enough that a leaked link goes stale. */
export const DEFAULT_FILE_TOKEN_TTL_SECONDS = 60 * 60;
export const MAX_FILE_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

/** Long enough for a path plus a signature, short enough to bound work. */
const MAX_TOKEN_LENGTH = 4096;

const b64url = (input: Buffer | string) => Buffer.from(input).toString("base64url");

function signingSecret(): string | null {
    const value = process.env.FILE_LINK_SECRET;
    return value && value.length > 0 ? value : null;
}

function sign(payload: string, hmacKey: string): Buffer {
    return createHmac("sha256", hmacKey).update(payload).digest();
}

export function createFileToken(objectKey: string, ttlSeconds: number): string | null {
    const hmacKey = signingSecret();
    if (!hmacKey) return null;

    const ttl = Math.min(Math.max(Math.floor(ttlSeconds), 60), MAX_FILE_TOKEN_TTL_SECONDS);
    const payload = b64url(
        JSON.stringify({ key: objectKey, exp: Math.floor(Date.now() / 1000) + ttl }),
    );
    return `${payload}.${b64url(sign(payload, hmacKey))}`;
}

/** Returns the object key the token authorises, or null if it is invalid. */
export function verifyFileToken(token: string): string | null {
    const hmacKey = signingSecret();
    if (!hmacKey) return null;
    if (token.length > MAX_TOKEN_LENGTH) return null;

    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;

    const given = Buffer.from(signature, "base64url");
    const expected = sign(payload, hmacKey);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

    let parsed: { key?: unknown; exp?: unknown };
    try {
        parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
    } catch {
        return null;
    }

    if (typeof parsed.key !== "string" || !parsed.key) return null;
    if (typeof parsed.exp !== "number" || parsed.exp * 1000 <= Date.now()) return null;
    return parsed.key;
}
