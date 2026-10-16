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
 *   files  private. Never given a public URL; read through /api/files/… and
 *          stored as opaque bytes, so nothing uploaded here can execute.
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
 * How a private object is written — both are object metadata, so *every* read
 * carries them: a presigned GET, a public URL if the bucket is misconfigured,
 * any client at all. That is what makes an uploaded SVG or HTML inert.
 *
 * There is deliberately no list of forbidden types. Screening a client-declared
 * type is a blocklist that has to be complete to be safe, and it never was:
 * `image/svg+xml` and `text/xml` run script when opened directly, and neither
 * was refused. A private file is stored with no type instead, so there is
 * nothing to screen.
 *
 * This lives on the object rather than as a `response-content-disposition` on
 * the GET because R2 documents Content-Disposition as PutObject system metadata
 * and not as a GetObject response parameter.
 */
const PRIVATE_CONTENT_TYPE = "application/octet-stream";
const PRIVATE_CONTENT_DISPOSITION = "attachment";

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

    // Only `media` is type-checked: those objects keep their type and are served
    // inline to every visitor. A private file's declared type is discarded (see
    // PRIVATE_CONTENT_TYPE), so there is no active type left to refuse.
    if (scope === "media") {
        if (!type) return { ok: false, error: "A content type is required." };
        if (!MEDIA_TYPES.has(type)) {
            return { ok: false, error: `Unsupported media type: ${type}` };
        }
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
    /** Byte length the client declared; signed in, so it becomes a hard cap. */
    size: number;
}): Promise<PresignResult> {
    const media = input.scope === "media";
    const contentType = media
        ? input.contentType.split(";")[0].trim().toLowerCase()
        : PRIVATE_CONTENT_TYPE;

    const headers: Record<string, string> = { "Content-Type": contentType };

    // SigV4 signs only `host` by default, leaving every other header a
    // suggestion the client could drop or change. Forcing these into the
    // signature makes sending them, unchanged, part of the contract.
    const signableHeaders = new Set(["content-type", "content-length"]);
    if (media) {
        headers["Cache-Control"] = MEDIA_CACHE_CONTROL;
        signableHeaders.add("cache-control");
    } else {
        headers["Content-Disposition"] = PRIVATE_CONTENT_DISPOSITION;
        signableHeaders.add("content-disposition");
    }

    const command = new PutObjectCommand({
        Bucket: bucketFor(input.scope),
        Key: input.key,
        ContentType: contentType,
        // Signing the length is what actually enforces MAX_BYTES: a body whose
        // Content-Length differs from the number signed here fails
        // SignatureDoesNotMatch, so an oversized file is rejected, not stored.
        ContentLength: input.size,
        ...(media
            ? { CacheControl: MEDIA_CACHE_CONTROL }
            : { ContentDisposition: PRIVATE_CONTENT_DISPOSITION }),
    });

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

/**
 * Short-lived direct URL to a private object, for the signed read proxy.
 *
 * No `response-content-*` overrides here: whether the object downloads or
 * renders is decided when it is written (see PRIVATE_CONTENT_TYPE). That is the
 * one place R2 guarantees the header, and it also covers reads that never go
 * through this function.
 */
export async function presignDownload(key: string, scope: UploadScope = "files"): Promise<string> {
    const command = new GetObjectCommand({ Bucket: bucketFor(scope), Key: key });
    return getSignedUrl(s3(), command, { expiresIn: DOWNLOAD_TTL_SECONDS });
}
