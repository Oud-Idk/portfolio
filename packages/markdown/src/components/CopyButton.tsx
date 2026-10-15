"use client";

import { useState } from "react";
import { ClipboardCopyIcon, CheckIcon } from "lucide-react";

export function CopyButton({ code }: { code: string }) {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = async (): Promise<void> => {
        if (!code) return;
        try {
            await navigator.clipboard.writeText(code);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy code: ", err);
        }
    };

    return (
        <button
            onClick={() => void handleCopy()}
            aria-label="Copy code"
            type="button"
            className="inline-flex items-center gap-1.5 px-2 py-1 bg-surface rounded-md text-xs font-sans text-muted-foreground hover:text-foreground hover:bg-surface-active border border-border-subtle transition-all focus-ring"
        >
            {isCopied ? (
                <>
                    <CheckIcon className="h-3.5 w-3.5 text-success" />
                    <span className="text-success font-medium">Copied!</span>
                </>
            ) : (
                <>
                    <ClipboardCopyIcon className="h-3.5 w-3.5" />
                    <span>Copy</span>
                </>
            )}
        </button>
    );
}