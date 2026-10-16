import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Uploads are authorised by Cloudflare Access, so there is no secret in the
 * browser and nothing to leak from it.
 *
 * Cloudflare adds a `Cf-Access-Jwt-Assertion` header to requests that pass an
 * Access policy — but a header is only worth trusting if it is *verified*.
 * Anything able to reach this server directly (the port is bound to loopback,
 * but that still means every other process on the host) could set that header
 * by hand. So we check the signature against Cloudflare's published keys and
 * confirm it was minted for our team and our application. A forged or replayed
 * header fails; the tunnel is still the only way in.
 *
 * Fails closed: unconfigured means unauthenticated.
 */

/** Set by Cloudflare on every request it proxies through an Access policy. */
export const ACCESS_JWT_HEADER = "cf-access-jwt-assertion";

export interface AccessIdentity {
    email: string | null;
    subject: string | null;
}

/** `team-name` or `https://team-name.cloudflareaccess.com` both work. */
function teamDomain(): string | null {
    const raw = process.env.CF_ACCESS_TEAM_DOMAIN?.trim().replace(/\/+$/, "");
    if (!raw) return null;
    return /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
}

/** One AUD per Access application; comma-separate them if you have several. */
function audiences(): string[] {
    return (process.env.CF_ACCESS_AUD ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
}

export function isAccessConfigured(): boolean {
    return Boolean(teamDomain() && audiences().length > 0);
}

/** Where to send someone to end their Access session (null if unconfigured). */
export function accessLogoutUrl(): string | null {
    const domain = teamDomain();
    return domain ? `${domain}/cdn-cgi/access/logout` : null;
}

/**
 * Local development has no tunnel in front of it. Opting out is deliberate and
 * doubly guarded: it needs an explicit env var *and* a non-production build, so
 * a stray variable in a deployed image can never open uploads.
 */
function devBypass(): boolean {
    return process.env.NODE_ENV !== "production" && process.env.CF_ACCESS_DEV_BYPASS === "1";
}

let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let cachedDomain: string | null = null;

function jwksFor(domain: string) {
    if (!cachedJwks || cachedDomain !== domain) {
        // Caches keys in memory and refetches on an unknown `kid`, so rotation works.
        cachedJwks = createRemoteJWKSet(new URL(`${domain}/cdn-cgi/access/certs`));
        cachedDomain = domain;
    }
    return cachedJwks;
}

/** The verified caller behind a request, or null if the token doesn't hold up. */
export async function verifyAccessToken(token: string | null): Promise<AccessIdentity | null> {
    if (devBypass()) return { email: "dev-bypass", subject: null };

    const domain = teamDomain();
    const aud = audiences();
    if (!domain || aud.length === 0) return null;
    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, jwksFor(domain), {
            issuer: domain,
            audience: aud,
        });
        return {
            email: typeof payload.email === "string" ? payload.email : null,
            subject: typeof payload.sub === "string" ? payload.sub : null,
        };
    } catch {
        return null;
    }
}
