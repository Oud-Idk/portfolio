"use client";

import React, { useRef, type ReactNode } from "react";

import { TableOfContents } from "./TableOfContents";
import type { TocItem } from "@/lib/markdown-toc";

interface MarkdownLayoutProps {
    /** Server-rendered document. Kept opaque here — only the ref matters to the ToC. */
    children: ReactNode;
    /** Heading outline, extracted from the markdown while it was rendered. */
    headings: TocItem[];
    showToc?: boolean;
}

/**
 * Client half of the markdown view: layout, the scroll container the ToC
 * measures, and the ToC's own scroll-spy. Everything else arrives as children.
 */
export const MarkdownLayout: React.FC<MarkdownLayoutProps> = ({ children, headings, showToc = true }) => {
    const contentRef = useRef<HTMLDivElement>(null);

    return (
        <div className="relative flex w-full justify-center gap-8">
            <div ref={contentRef} className="min-w-0 max-w-4xl flex-1">
                {children}
            </div>

            {showToc && (
                <aside className="hidden xl:block max-w-80 shrink-0">
                    <div className="sticky top-20 max-h-[calc(100vh-30rem)] overflow-y-auto pr-2 scrollbar-thin">
                        <TableOfContents containerRef={contentRef} headings={headings} />
                    </div>
                </aside>
            )}
        </div>
    );
};