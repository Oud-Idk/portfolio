import { MarkdownLayout } from "@/components/ui/markdown/MarkdownLayout";
import { MarkdownRenderer } from "@/components/ui/markdown/MarkdownRenderer";
import type { TocItem } from "@/lib/markdown-toc";

interface MarkdownWithTocProps {
    content?: string;
    className?: string;
    showToc?: boolean;
}

/**
 * Server component: renders the document and derives its ToC from the same
 * parse, then hands both to the client shell that owns the scroll-spy.
 */
export async function MarkdownWithToc({ content, className = "", showToc = true }: MarkdownWithTocProps) {
    const headings: TocItem[] = [];

    const document = await MarkdownRenderer({ content, className, headings });

    return (
        <MarkdownLayout headings={headings} showToc={showToc}>
            {document}
        </MarkdownLayout>
    );
}