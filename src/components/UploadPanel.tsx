"use client";

import { useCallback, useRef, useState } from "react";
import { Check, Copy, Link2, Loader2, TriangleAlert, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
    createShareLink,
    humanSize,
    inferScope,
    markdownSnippet,
    uploadFile,
    useUploadSession,
    type UploadSession,
} from "@/lib/upload-client";
import type { UploadScope, UploadedFile } from "@/lib/upload-types";

const COPIED_RESET_MS = 1500;

type ItemStatus = "queued" | "uploading" | "done" | "error";

interface Item {
    id: string;
    file: File;
    scope: UploadScope;
    status: ItemStatus;
    progress: number;
    error?: string;
    result?: UploadedFile;
    shareUrl?: string;
}

type ScopeMode = "auto" | UploadScope;

/**
 * Owner-only uploader. Files go straight from this browser to object storage
 * over a presigned URL, so no bytes pass through the app server.
 *
 * There is no secret here: Cloudflare Access identifies the caller, and the
 * browser holds nothing it could leak.
 */
export function UploadPanel() {
    const session = useUploadSession();
    const [scopeMode, setScopeMode] = useState<ScopeMode>("auto");
    const [items, setItems] = useState<Item[]>([]);
    const [dragging, setDragging] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const ready = session.status === "authenticated";

    const patch = useCallback((id: string, changes: Partial<Item>) => {
        setItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, ...changes } : item)),
        );
    }, []);

    const copy = useCallback(async (value: string, id: string) => {
        try {
            await navigator.clipboard.writeText(value);
        } catch {
            setNotice("Couldn't reach the clipboard — copy it manually.");
            return;
        }
        setCopied(id);
        window.setTimeout(
            () => setCopied((current) => (current === id ? null : current)),
            COPIED_RESET_MS,
        );
    }, []);

    const handleFiles = useCallback(
        async (files: File[]) => {
            if (files.length === 0 || !ready) return;
            setNotice(null);

            const queued: Item[] = files.map((file) => ({
                id: crypto.randomUUID(),
                file,
                scope: scopeMode === "auto" ? inferScope(file) : scopeMode,
                status: "queued",
                progress: 0,
            }));
            setItems((prev) => [...queued, ...prev]);

            // One at a time: the files are large and the bucket sees enough traffic.
            for (const item of queued) {
                patch(item.id, { status: "uploading", progress: 0 });
                try {
                    const result = await uploadFile(item.file, item.scope, (fraction) =>
                        patch(item.id, { progress: fraction }),
                    );
                    patch(item.id, { status: "done", progress: 1, result });
                } catch (error) {
                    patch(item.id, {
                        status: "error",
                        error: error instanceof Error ? error.message : "Upload failed.",
                    });
                }
            }
        },
        [patch, ready, scopeMode],
    );

    async function requestShareLink(item: Item) {
        if (!item.result) return;
        try {
            patch(item.id, { shareUrl: await createShareLink(item.result.key) });
        } catch (error) {
            patch(item.id, {
                error: error instanceof Error ? error.message : "Could not create a link.",
            });
        }
    }

    function onInputChange(event: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(event.target.files ?? []);
        event.target.value = "";
        void handleFiles(files);
    }

    function onDrop(event: React.DragEvent) {
        event.preventDefault();
        setDragging(false);
        void handleFiles(Array.from(event.dataTransfer.files));
    }

    return (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Uploads</CardTitle>
                    <CardDescription>
                        Files upload straight to object storage. You are identified by
                        Cloudflare Access, so there is no secret to paste — or to leak.
                    </CardDescription>
                </CardHeader>
                <CardContent className="gap-4">
                    <SessionLine session={session} />

                    <div className="grid gap-2">
                        <Label htmlFor="upload-scope">Destination</Label>
                        <select
                            id="upload-scope"
                            value={scopeMode}
                            disabled={!ready}
                            onChange={(event) => setScopeMode(event.target.value as ScopeMode)}
                            className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                        >
                            <option value="auto">
                                Auto — images &amp; videos public, rest private
                            </option>
                            <option value="media">Force public media</option>
                            <option value="files">Force private file</option>
                        </select>
                    </div>

                    <button
                        type="button"
                        disabled={!ready}
                        onClick={() => inputRef.current?.click()}
                        onDragOver={(event) => {
                            event.preventDefault();
                            if (ready) setDragging(true);
                        }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={onDrop}
                        className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                            dragging
                                ? "border-ring bg-muted text-foreground"
                                : "border-border text-muted-foreground hover:bg-muted/50"
                        }`}
                    >
                        <Upload className="size-5" />
                        <span className="font-medium text-foreground">
                            Drop files, or click to choose
                        </span>
                        <span>Videos up to 200&nbsp;MB · other files up to 100&nbsp;MB</span>
                    </button>
                    <input
                        ref={inputRef}
                        type="file"
                        multiple
                        hidden
                        onChange={onInputChange}
                    />

                    {notice && (
                        <p className="text-destructive text-xs font-medium">{notice}</p>
                    )}
                </CardContent>
            </Card>

            {items.length > 0 && (
                <div className="flex flex-col gap-3">
                    {items.map((item) => (
                        <UploadRow
                            key={item.id}
                            item={item}
                            copied={copied}
                            onCopy={copy}
                            onShare={() => void requestShareLink(item)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function SessionLine({ session }: { session: UploadSession }) {
    if (session.status === "loading") {
        return (
            <p className="text-muted-foreground flex items-center gap-2 text-xs">
                <Loader2 className="size-3.5 animate-spin" /> Checking access…
            </p>
        );
    }

    if (session.status === "authenticated") {
        return (
            <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <Check className="size-3.5" />
                <span>
                    Signed in{session.email ? ` as ${session.email}` : ""} via Cloudflare
                    Access
                </span>
                {session.logoutUrl && (
                    <a href={session.logoutUrl} className="underline underline-offset-4">
                        Sign out
                    </a>
                )}
            </p>
        );
    }

    if (session.status === "unconfigured") {
        return (
            <p className="text-destructive flex items-center gap-2 text-xs font-medium">
                <TriangleAlert className="size-3.5" />
                Uploads are disabled — set CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD.
            </p>
        );
    }

    return (
        <p className="text-destructive flex items-center gap-2 text-xs font-medium">
            <TriangleAlert className="size-3.5" />
            Not authenticated by Cloudflare Access. Check that your Access policy covers
            /api/uploads/* as well as this page.
        </p>
    );
}

interface UploadRowProps {
    item: Item;
    copied: string | null;
    onCopy: (value: string, id: string) => void;
    onShare: () => void;
}

function UploadRow({ item, copied, onCopy, onShare }: UploadRowProps) {
    const snippet = item.result ? markdownSnippet(item.result) : "";

    return (
        <Card size="sm">
            <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2">
                    <span className="truncate">{item.file.name}</span>
                    <Badge variant="secondary">
                        {item.scope === "media" ? "public media" : "private file"}
                    </Badge>
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                    <span>{humanSize(item.file.size)}</span>
                    <span aria-hidden>·</span>
                    <StatusLabel status={item.status} progress={item.progress} />
                </CardDescription>
            </CardHeader>

            <CardContent>
                {item.status === "uploading" && (
                    <div
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(item.progress * 100)}
                        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                    >
                        <div
                            className="h-full bg-primary transition-[width]"
                            style={{ width: `${Math.round(item.progress * 100)}%` }}
                        />
                    </div>
                )}

                {item.error && (
                    <p className="text-destructive flex items-center gap-2 text-xs font-medium">
                        <TriangleAlert className="size-3.5" />
                        {item.error}
                    </p>
                )}

                {item.result && item.scope === "media" && item.result.publicUrl && (
                    <>
                        <div className="overflow-hidden rounded-md border border-border bg-muted/40">
                            {item.result.contentType.startsWith("video/") ? (
                                <video
                                    className="block h-auto w-full"
                                    src={item.result.publicUrl}
                                    width={1600}
                                    height={900}
                                    muted
                                    loop
                                    autoPlay
                                    playsInline
                                />
                            ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={item.result.publicUrl}
                                    alt={item.file.name}
                                    className="max-h-64 w-full object-contain"
                                />
                            )}
                        </div>

                        <CopyField
                            label="Public URL"
                            value={item.result.publicUrl}
                            id={`${item.id}-url`}
                            copied={copied}
                            onCopy={onCopy}
                        />
                        {snippet && (
                            <CopyField
                                label="Markdown"
                                value={snippet}
                                id={`${item.id}-md`}
                                copied={copied}
                                onCopy={onCopy}
                                mono
                            />
                        )}
                    </>
                )}

                {item.result && item.scope === "files" && (
                    <>
                        <Separator />
                        <p className="text-muted-foreground text-xs">
                            Private — readable only through a signed link.
                        </p>
                        {item.shareUrl ? (
                            <CopyField
                                label="Share link"
                                value={item.shareUrl}
                                id={`${item.id}-share`}
                                copied={copied}
                                onCopy={onCopy}
                            />
                        ) : (
                            <Button size="sm" variant="outline" onClick={onShare}>
                                <Link2 /> Create share link
                            </Button>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}

function StatusLabel({ status, progress }: { status: ItemStatus; progress: number }) {
    if (status === "uploading") {
        return (
            <span className="flex items-center gap-1.5">
                <Loader2 className="size-3.5 animate-spin" />
                {Math.round(progress * 100)}%
            </span>
        );
    }
    if (status === "done") {
        return (
            <span className="flex items-center gap-1.5 text-success">
                <Check className="size-3.5" /> Uploaded
            </span>
        );
    }
    if (status === "error") return <span className="text-destructive">Failed</span>;
    return <span>Queued</span>;
}

interface CopyFieldProps {
    label: string;
    value: string;
    id: string;
    copied: string | null;
    onCopy: (value: string, id: string) => void;
    mono?: boolean;
}

function CopyField({ label, value, id, copied, onCopy, mono }: CopyFieldProps) {
    return (
        <div className="grid gap-1.5">
            <Label className="text-muted-foreground text-xs">{label}</Label>
            <div className="flex items-center gap-2">
                <code
                    className={`flex-1 truncate rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs ${
                        mono ? "font-mono" : ""
                    }`}
                    title={value}
                >
                    {value}
                </code>
                <Button
                    size="icon-sm"
                    variant="outline"
                    aria-label={`Copy ${label.toLowerCase()}`}
                    onClick={() => onCopy(value, id)}
                >
                    {copied === id ? <Check /> : <Copy />}
                </Button>
            </div>
        </div>
    );
}
