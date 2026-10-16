import { randomUUID } from "node:crypto";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { PresignResult, UploadScope } from "./upload-types";

export type { PresignResult, UploadScope } from "./upload-types";

/**
 * Everything the app knows about object storage lives here, so callers deal in
 * keys and URLs rather than buckets and signatures.
 *
 * Works with any S3-compatible store; it is written for Cloudflare R2 (region
 * "auto", path-style addressing, an R2 API token as the credentials). Two
 * scopes map onto two buckets:
 *
 *   media  public, immutable, long-cached. Videos/images embedded in posts.
 *   files  private. Never given a public URL; read through /api/files/…
 *
 * `S3_PRIVATE_BUCKET` may be left unset, in which case both scopes share
 * `S3_BUCKET` — see `privateBucketIsShared()`.
 */

/** Long enough to push a big video, short enough that a leaked URL goes stale. */
const UPLOAD_TTL_SECONDS = 60 * 15;
/** A private read should finish inside this window. */
const DOWNLOAD_TTL_SECONDS = 60 * 5;

/** Keys carry a random id, so a key's bytes never change under it. */
const MEDIA_CACHE_CONTROL = "public, max-age=31536000, immutable";

const MAX_BYTES: Record<UploadScope, number> = {
    media: 200 * 1024 * 1024,
    files: 100 * 1024 * 1024,
};

/** What may be embedded in a post. Strict: these are served to every visitor. */
const MEDIA_TYPES = new Set([
    "image/avif",
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/svg+xml",
    "image/webp",
    "video/mp4",
    "video/ogg",
    "video/quicktime",
    "video/webm",
]);

/**
 * What may be stored privately. Broad, but active content is refused: these
 * objects are still served from an origin we don't control the headers of, and
 * there is no reason for a portfolio attachment to be executable.
 */
const ACTIVE_TYPES = new Set([
    "application/javascript",
    "application/x-httpd-php",
    "application/xhtml+xml",
    "text/html",
    "text/javascript",
]);

function env(name: string): string {
    return process.env[name]?.trim() ?? "";
}

export function isS3Configured(): boolean {
    return Boolean(
        env("S3_ENDPOINT") &&
            env("S3_BUCKET") &&
            env("S3_ACCESS_KEY_ID") &&
            env("S3_SECRET_ACCESS_KEY"),
    );
}

/** True when private files land in the same bucket as public media. */
export function privateBucketIsShared(): boolean {
    return !env("S3_PRIVATE_BUCKET");
}

export function bucketFor(scope: UploadScope): string {
    if (scope === "files") {
        return env("S3_PRIVATE_BUCKET") || env("S3_BUCKET");
    }
    return env("S3_BUCKET");
}

let cachedClient: S3Client | null = null;

function s3(): S3Client {
    if (!cachedClient) {
        cachedClient = new S3Client({
            region: env("S3_REGION") || "auto",
            endpoint: env("S3_ENDPOINT"),
            // R2 doesn't serve virtual-hosted-style requests; MinIO doesn't either.
            forcePathStyle: true,
            // The SDK's default ("WHEN_SUPPORTED") attaches a body checksum to
            // PutObject — computed from nothing at presign time, so the browser's
            // real payload fails it. It also adds query params R2 won't take.
            requestChecksumCalculation: "WHEN_REQUIRED",
            credentials: {
                accessKeyId: env("S3_ACCESS_KEY_ID"),
                secretAccessKey: env("S3_SECRET_ACCESS_KEY"),
            },
        });
    }
    return cachedClient;
}

/** Public URL for a `media` key, or "" when no public base is configured. */
export function mediaPublicUrl(key: string): string {
    const base = env("S3_PUBLIC_BASE_URL").replace(/\/+$/, "");
    return base ? `${base}/${key}` : "";
}

/** A URL-safe filename, extension preserved, capped so keys stay short. */
export function safeFilename(filename: string): string {
    const base = filename.split(/[\\/]/).pop() ?? "file";
    const cleaned = base
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-")
        .replace(/^[-.]+|[-.]+$/g, "");

    const dot = cleaned.lastIndexOf(".");
    const ext = dot > 0 ? cleaned.slice(dot, dot + 12) : "";
    const stem = (dot > 0 ? cleaned.slice(0, dot) : cleaned).slice(0, 60);
    return `${stem || "file"}${ext}`;
}

/** `scope/YYYY-MM/<random>-<name>` — dated for humans, unique for caching. */
export function buildKey(scope: UploadScope, filename: string): string {
    const now = new Date();
    const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const id = randomUUID().replace(/-/g, "").slice(0, 12);
    return `${scope}/${month}/${id}-${safeFilename(filename)}`;
}

export interface UploadValidation {
    ok: boolean;
    error?: string;
}

export function validateUpload(
    scope: UploadScope,
    contentType: string,
    size: number,
): UploadValidation {
    const type = contentType.split(";")[0].trim().toLowerCase();

    if (!type) return { ok: false, error: "A content type is required." };

    if (scope === "media" && !MEDIA_TYPES.has(type)) {
        return { ok: false, error: `Unsupported media type: ${type}` };
    }
    if (scope === "files" && ACTIVE_TYPES.has(type)) {
        return { ok: false, error: `Refusing active content: ${type}` };
    }

    if (!Number.isFinite(size) || size <= 0) {
        return { ok: false, error: "A positive file size is required." };
    }
    const max = MAX_BYTES[scope];
    if (size > max) {
        return {
            ok: false,
            error: `File is too large (max ${Math.floor(max / 1024 / 1024)} MiB).`,
        };
    }

    return { ok: true };
}

export async function presignUpload(input: {
    scope: UploadScope;
    key: string;
    contentType: string;
}): Promise<PresignResult> {
    const contentType = input.contentType.split(";")[0].trim().toLowerCase();
    const headers: Record<string, string> = { "Content-Type": contentType };
    const media = input.scope === "media";
    if (media) headers["Cache-Control"] = MEDIA_CACHE_CONTROL;

    const command = new PutObjectCommand({
        Bucket: bucketFor(input.scope),
        Key: input.key,
        ContentType: contentType,
        ...(media ? { CacheControl: MEDIA_CACHE_CONTROL } : {}),
    });

    // SigV4 signs only `host` by default, which would leave the content type as
    // a suggestion the client could drop — storing a video as octet-stream.
    // Forcing these into the signature makes sending them part of the contract.
    const signableHeaders = new Set(["content-type"]);
    if (media) signableHeaders.add("cache-control");

    const uploadUrl = await getSignedUrl(s3(), command, {
        expiresIn: UPLOAD_TTL_SECONDS,
        signableHeaders,
    });

    return {
        key: input.key,
        uploadUrl,
        headers,
        publicUrl: media ? mediaPublicUrl(input.key) : "",
        expiresIn: UPLOAD_TTL_SECONDS,
    };
}

/** Short-lived direct URL to a private object, for the signed read proxy. */
export async function presignDownload(key: string, scope: UploadScope = "files"): Promise<string> {
    const command = new GetObjectCommand({ Bucket: bucketFor(scope), Key: key });
    return getSignedUrl(s3(), command, { expiresIn: DOWNLOAD_TTL_SECONDS });
}
