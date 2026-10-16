/**
 * The wire contract between the uploader surfaces (web page, Sanity Studio
 * tool) and `/api/uploads/*`. Kept free of Node imports so client components
 * can share it without pulling `node:crypto` into the browser bundle.
 */

export type UploadScope = "media" | "files";

export interface PresignResult {
    key: string;
    uploadUrl: string;
    /** Headers the client must send verbatim, or the signature won't match. */
    headers: Record<string, string>;
    /** Public URL for `media`; empty for `files`. */
    publicUrl: string;
    expiresIn: number;
}

export interface UploadedFile extends PresignResult {
    name: string;
    size: number;
    contentType: string;
    scope: UploadScope;
}
