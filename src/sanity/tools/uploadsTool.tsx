"use client";

import { useCallback, useRef, useState } from "react";
import {
    Badge,
    Box,
    Button,
    Card,
    Flex,
    Heading,
    Inline,
    Label,
    Stack,
    Text,
} from "@sanity/ui";

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

type ItemStatus = "uploading" | "done" | "error";
type ScopeMode = "auto" | UploadScope;

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

/**
 * "Uploads" panel inside the Studio, so a file can be pushed and its markdown
 * copied without leaving the content editor. Same HTTP contract as the web
 * uploader (`src/components/UploadPanel.tsx`); this is the @sanity/ui shell.
 *
 * No credential is held here: Cloudflare Access identifies the caller to the
 * API, and the browser never sees a secret.
 */
export function UploadsTool() {
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
        window.setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500);
    }, []);

    const handleFiles = useCallback(
        async (files: File[]) => {
            if (files.length === 0) return;
            if (!ready) {
                setNotice("Not authenticated by Cloudflare Access.");
                return;
            }
            setNotice(null);

            const queued: Item[] = files.map((file) => ({
                id: crypto.randomUUID(),
                file,
                scope: scopeMode === "auto" ? inferScope(file) : scopeMode,
                status: "uploading",
                progress: 0,
            }));
            setItems((prev) => [...queued, ...prev]);

            for (const item of queued) {
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

    return (
        <Card height="fill" overflow="auto" padding={5}>
            <Stack gap={5} style={{ maxWidth: 780, margin: "0 auto" }}>
                <Stack gap={3}>
                    <Heading as="h1" size={2}>
                        Uploads
                    </Heading>
                    <Text muted size={1}>
                        Files go straight to object storage over a presigned URL. You are
                        identified by Cloudflare Access, so there is no secret to paste — or
                        to leak.
                    </Text>
                </Stack>

                <SessionNotice session={session} />

                <Card border padding={4} radius={2}>
                    <Stack gap={4}>
                        <Stack gap={2}>
                            <Label htmlFor="studio-upload-scope" as="label">
                                <Text size={1} weight="semibold" as="span">
                                    Destination
                                </Text>
                            </Label>
                            <select
                                id="studio-upload-scope"
                                value={scopeMode}
                                disabled={!ready}
                                onChange={(e) =>
                                    setScopeMode(e.currentTarget.value as ScopeMode)
                                }
                                style={{
                                    width: "100%",
                                    height: 35,
                                    padding: "0 8px",
                                    borderRadius: 3,
                                    border: "1px solid var(--card-hairline-soft-color)",
                                    background: "transparent",
                                    color: "inherit",
                                    font: "inherit",
                                }}
                            >
                                <option value="auto">
                                    Auto — images &amp; videos public, rest private
                                </option>
                                <option value="media">Force public media</option>
                                <option value="files">Force private file</option>
                            </select>
                        </Stack>

                        <Card
                            border
                            radius={2}
                            padding={5}
                            tone={dragging ? "primary" : "transparent"}
                            style={{
                                borderStyle: "dashed",
                                textAlign: "center",
                                cursor: ready ? "pointer" : "not-allowed",
                                opacity: ready ? 1 : 0.5,
                            }}
                            onClick={() => {
                                if (ready) inputRef.current?.click();
                            }}
                            onDragOver={(event: React.DragEvent) => {
                                event.preventDefault();
                                if (ready) setDragging(true);
                            }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={(event: React.DragEvent) => {
                                event.preventDefault();
                                setDragging(false);
                                void handleFiles(Array.from(event.dataTransfer.files));
                            }}
                        >
                            <Stack gap={3}>
                                <Text weight="semibold" size={1}>
                                    Drop files, or click to choose
                                </Text>
                                <Text muted size={1}>
                                    Videos up to 200&nbsp;MB · other files up to 100&nbsp;MB
                                </Text>
                            </Stack>
                        </Card>
                        <input
                            ref={inputRef}
                            type="file"
                            multiple
                            hidden
                            onChange={(event) => {
                                const files = Array.from(event.target.files ?? []);
                                event.target.value = "";
                                void handleFiles(files);
                            }}
                        />

                        {notice && (
                            <Card tone="critical" padding={3} radius={2}>
                                <Text size={1}>{notice}</Text>
                            </Card>
                        )}
                    </Stack>
                </Card>

                {items.map((item) => (
                    <ResultCard
                        key={item.id}
                        item={item}
                        copied={copied}
                        onCopy={copy}
                        onShare={() => void requestShareLink(item)}
                    />
                ))}
            </Stack>
        </Card>
    );
}

/** Says who the API thinks you are, and flags a policy that misses the API. */
function SessionNotice({ session }: { session: UploadSession }) {
    if (session.status === "authenticated") {
        return (
            <Text muted size={1}>
                Signed in{session.email ? ` as ${session.email}` : ""} via Cloudflare Access.
                {session.logoutUrl ? (
                    <>
                        {" "}
                        <a href={session.logoutUrl}>Sign out</a>
                    </>
                ) : null}
            </Text>
        );
    }

    if (session.status === "loading") {
        return (
            <Text muted size={1}>
                Checking access…
            </Text>
        );
    }

    return (
        <Card tone="critical" padding={3} radius={2}>
            <Text size={1}>
                {session.status === "unconfigured"
                    ? "Uploads are disabled — set CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD."
                    : "Not authenticated by Cloudflare Access. Check that your Access policy covers /api/uploads/* as well as this page."}
            </Text>
        </Card>
    );
}

interface ResultCardProps {
    item: Item;
    copied: string | null;
    onCopy: (value: string, id: string) => void;
    onShare: () => void;
}

function ResultCard({ item, copied, onCopy, onShare }: ResultCardProps) {
    const isVideo = item.file.type.startsWith("video/");
    const snippet = item.result ? markdownSnippet(item.result) : "";
    const url = item.result?.publicUrl ?? "";

    return (
        <Card border padding={4} radius={2}>
            <Stack gap={4}>
                <Flex align="center" justify="space-between" gap={3} wrap="wrap">
                    <Text weight="semibold" size={1} textOverflow="ellipsis">
                        {item.file.name}
                    </Text>
                    <Inline gap={2}>
                        <Badge
                            tone={item.scope === "media" ? "primary" : "default"}
                            fontSize={0}
                        >
                            {item.scope === "media" ? "public media" : "private file"}
                        </Badge>
                        <Text muted size={1}>
                            {humanSize(item.file.size)}
                        </Text>
                    </Inline>
                </Flex>

                {item.status === "uploading" && (
                    <Text muted size={1}>
                        Uploading… {Math.round(item.progress * 100)}%
                    </Text>
                )}
                {item.status === "done" && (
                    <Inline>
                        <Badge tone="positive" fontSize={0}>
                            Uploaded
                        </Badge>
                    </Inline>
                )}
                {item.error && (
                    <Card tone="critical" padding={3} radius={2}>
                        <Text size={1}>{item.error}</Text>
                    </Card>
                )}

                {item.result && item.scope === "media" && url && (
                    <Box style={{ overflow: "hidden", borderRadius: 4 }}>
                        {isVideo ? (
                            <video
                                src={url}
                                width={1600}
                                height={900}
                                muted
                                loop
                                autoPlay
                                playsInline
                                style={{ width: "100%", height: "auto", display: "block" }}
                            />
                        ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={url}
                                alt={item.file.name}
                                style={{ maxHeight: 240, width: "100%", objectFit: "contain" }}
                            />
                        )}
                    </Box>
                )}

                {item.result && item.scope === "media" && url && (
                    <Stack gap={3}>
                        <CopyRow
                            label="Public URL"
                            value={url}
                            id={`${item.id}-url`}
                            copied={copied}
                            onCopy={onCopy}
                        />
                        {snippet && (
                            <CopyRow
                                label="Markdown"
                                value={snippet}
                                id={`${item.id}-md`}
                                copied={copied}
                                onCopy={onCopy}
                            />
                        )}
                    </Stack>
                )}

                {item.result && item.scope === "files" && (
                    <Stack gap={3}>
                        <Text muted size={1}>
                            Private — readable only through a signed link.
                        </Text>
                        <Text as="code" size={1} style={{ wordBreak: "break-all" }}>
                            {item.result.key}
                        </Text>
                        {item.shareUrl ? (
                            <CopyRow
                                label="Share link"
                                value={item.shareUrl}
                                id={`${item.id}-share`}
                                copied={copied}
                                onCopy={onCopy}
                            />
                        ) : (
                            <Inline>
                                <Button
                                    text="Create share link"
                                    mode="ghost"
                                    onClick={onShare}
                                />
                            </Inline>
                        )}
                    </Stack>
                )}
            </Stack>
        </Card>
    );
}

interface CopyRowProps {
    label: string;
    value: string;
    id: string;
    copied: string | null;
    onCopy: (value: string, id: string) => void;
}

function CopyRow({ label, value, id, copied, onCopy }: CopyRowProps) {
    return (
        <Stack gap={2}>
            <Label muted size={1}>
                {label}
            </Label>
            <Flex gap={2} align="center">
                <Box style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                    <Text as="code" size={1} style={{ wordBreak: "break-all" }}>
                        {value}
                    </Text>
                </Box>
                <Button
                    text={copied === id ? "Copied" : "Copy"}
                    mode="ghost"
                    tone={copied === id ? "positive" : "default"}
                    onClick={() => onCopy(value, id)}
                />
            </Flex>
        </Stack>
    );
}
