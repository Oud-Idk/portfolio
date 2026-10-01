"use client";

import React, { type ReactNode } from 'react';

import { useMarkdownScroller } from "@/components/ui/markdown/useMarkdownScroller";
import { cn } from "@/lib/utils";

interface ScrollableMarkdownViewerProps {
    /** Server-rendered markdown, e.g. `<MarkdownRenderer content={...} />`. */
    children: ReactNode;
    className?: string;
}

/**
 * Scroll container with in-container anchor scrolling. Takes children rather
 * than a source string because the document itself is rendered on the server.
 */
export const ScrollableMarkdownViewer: React.FC<ScrollableMarkdownViewerProps> = ({
    children,
    className,
}) => {
    const { containerRef, handleLinkClick } = useMarkdownScroller();

    return (
        <div
            ref={containerRef}
            onClick={handleLinkClick}
            className={cn("overflow-auto", className)}
        >
            {children}
        </div>
    );
};