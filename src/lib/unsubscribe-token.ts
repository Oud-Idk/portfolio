import { createHmac, timingSafeEqual } from "crypto";

/**
 * Signed, expiring unsubscribe links.
 *
 * An unsubscribe URL is a bearer token: whoever holds it can act on it. So the
 * only way to stop somebody else unsubscribing your subscribers is to never
 * accept an identifier they could have obtained some other way — a bare contact
 * id, or a bare email address. Instead every link carries an HMAC over the
 * target and an expiry, minted server side and checked with a constant-time
 * compare.
 *
 * Two subjects:
 *   - `contact`: minted straight after signup, when we already hold the Resend
 *     contact id. Used for the welcome email.
 *   - `email`:   minted by the /unsubscribe form and mailed to the address
 *     being removed. Resend broadcasts don't expose per-recipient data, so for
 *     those the token has to travel by email — which is what proves the
 *     requester owns the mailbox rather than merely knowing the address.
 */

export type UnsubscribeTarget =
    | { kind: "contact"; id: string }
    | { kind: "email"; email: string };

/** Long-lived: the welcome email's link should keep working for months. */
export const WELCOME_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 180;
/** Short: the /unsubscribe form mails a one-hour link. */
export const REQUEST_TOKEN_TTL_SECONDS = 60 * 60;

/** Long enough for a UUID payload plus a signature, short enough to bound work. */
const MAX_TOKEN_LENGTH = 4096;

const b64url = (input: Buffer | string) => Buffer.from(input).toString("base64url");

function sign(payload: string, key: string): Buffer {
    return createHmac("sha256", key).update(payload).digest();
}

export function createUnsubscribeToken(
    target: UnsubscribeTarget,
    ttlSeconds: number,
): string {
    const key = process.env.UNSUBSCRIBE_TOKEN_SECRET;
    if (!key) throw new Error("UNSUBSCRIBE_TOKEN_SECRET is not set");

    const payload = b64url(
        JSON.stringify({
            kind: target.kind,
            ...(target.kind === "contact" ? { id: target.id } : { email: target.email }),
            exp: Math.floor(Date.now() / 1000) + ttlSeconds,
        }),
    );
    return `${payload}.${b64url(sign(payload, key))}`;
}

/**
 * Returns the target the token authorises, or null if the token is malformed,
 * forged, or expired. Fails closed: with no secret configured nothing verifies.
 */
export function verifyUnsubscribeToken(token: string): UnsubscribeTarget | null {
    const key = process.env.UNSUBSCRIBE_TOKEN_SECRET;
    if (!key) return null;
    if (token.length > MAX_TOKEN_LENGTH) return null;

    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;

    const given = Buffer.from(signature, "base64url");
    const expected = sign(payload, key);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

    let parsed: { kind?: unknown; id?: unknown; email?: unknown; exp?: unknown };
    try {
        parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
    } catch {
        return null;
    }

    if (typeof parsed.exp !== "number" || parsed.exp * 1000 <= Date.now()) return null;

    if (parsed.kind === "contact" && typeof parsed.id === "string" && parsed.id) {
        return { kind: "contact", id: parsed.id };
    }
    if (parsed.kind === "email" && typeof parsed.email === "string" && parsed.email) {
        return { kind: "email", email: parsed.email };
    }
    return null;
}