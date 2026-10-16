"use client";

import { useEffect, useState } from "react";

import type { PresignResult, UploadedFile, UploadScope } from "./upload-types";

/**
 * Browser half of the upload flow, shared by the web uploader and the Sanity
 * Studio tool. Server half lives in `s3.ts` / the `/api/uploads` routes; this
 * module only talks to those over HTTP, so it must stay free of Node imports.
 *
 * There is no credential here. The caller is identified by Cloudflare Access,
 * which attaches a signed token to requests as they pass through the tunnel —
 * the browser holds no secret, only a session cookie it cannot read.
 */

export interface UploadSession {
    status: "loading" | "authenticated" | "unauthenticated" | "unconfigured";
    email: string | null;
    logoutUrl: string | null;
}

/**
 * Resolves the current Access identity. Doubles as a check that the policy
 * covers `/api/uploads/*` and not just the page: if the page renders but this
 * reports `unauthenticated`, the Access application is scoped too narrowly.
 */
export function useUploadSession(): UploadSession {
    const [session, setSession] = useState<UploadSession>({
        status: "loading",
        email: null,
        logoutUrl: null,
    });

    useEffect(() => {
        let cancelled = false;

        void (async () => {
            try {
                const response = await fetch("/api/uploads/session", {
                    credentials: "same-origin",
                });
                if (cancelled) return;

                if (response.ok) {
                    const data = (await response.json()) as {
                        email?: string | null;
                        logoutUrl?: string | null;
                    };
                    setSession({
                        status: "authenticated",
                        email: data.email ?? null,
                        logoutUrl: data.logoutUrl ?? null,
                    });
                } else {
                    setSession({
                        status: response.status === 503 ? "unconfigured" : "unauthenticated",
                        email: null,
                        logoutUrl: null,
                    });
                }
            } catch {
                if (!cancelled) {
                    setSession({ status: "unauthenticated", email: null, logoutUrl: null });
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    return session;
}

export function inferScope(file: File): UploadScope {
    return file.type.startsWith("video/") || file.type.startsWith("image/")
        ? "media"
        : "files";
}

async function presign(input: {
    filename: string;
    contentType: string;
    size: number;
    scope: UploadScope;
}): Promise<PresignResult> {
    const response = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(input),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
        throw new Error(data.error ?? `Could not sign the upload (${response.status}).`);
    }
    return data as PresignResult;
}

/**
 * Direct PUT to storage. XHR rather than fetch: `fetch` still can't report
 * upload progress, and a progress bar is the whole point of a big video upload.
 */
function put(
    url: string,
    headers: Record<string, string>,
    file: File,
    onProgress?: (fraction: number) => void,
): Promise<void> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", url, true);
        for (const [name, value] of Object.entries(headers)) {
            xhr.setRequestHeader(name, value);
        }
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && onProgress) {
                onProgress(event.loaded / event.total);
            }
        };
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`Storage rejected the upload (${xhr.status}).`));
        };
        xhr.onerror = () => reject(new Error("Network error while uploading."));
        xhr.onabort = () => reject(new Error("Upload cancelled."));
        xhr.send(file);
    });
}

export async function uploadFile(
    file: File,
    scope: UploadScope,
    onProgress?: (fraction: number) => void,
): Promise<UploadedFile> {
    const contentType = file.type || "application/octet-stream";
    const result = await presign({
        filename: file.name,
        contentType,
        size: file.size,
        scope,
    });
    await put(result.uploadUrl, result.headers, file, onProgress);
    return { ...result, name: file.name, size: file.size, contentType, scope };
}

/** Mint a signed, expiring link to a private object. */
export async function createShareLink(key: string, ttlSeconds?: number): Promise<string> {
    const response = await fetch("/api/uploads/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ key, ttlSeconds }),
    });
    const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!response.ok || !data.url) {
        throw new Error(data.error ?? `Could not create a link (${response.status}).`);
    }
    return data.url;
}

function altFromName(name: string): string {
    return name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "image";
}

/**
 * Ready-to-paste markdown for a `media` upload — an autoplaying `:::video` for
 * clips, a plain image otherwise. Private files have no public URL, so they get
 * a share link instead (see `createShareLink`).
 */
export function markdownSnippet(file: UploadedFile): string {
    if (file.scope !== "media" || !file.publicUrl) return "";
    return file.contentType.startsWith("video/")
        ? `:::video{src="${file.publicUrl}"}`
        : `![${altFromName(file.name)}](${file.publicUrl})`;
}

export function humanSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
