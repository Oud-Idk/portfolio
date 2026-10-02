import "katex/dist/katex.min.css";

import React, { type ReactNode } from "react";
import { MarkdownAsync, type Components } from "react-markdown";
import type { PluggableList } from "unified";

import { getLinguist } from "@/lib/linguist";
import { rehypePlugins, remarkPlugins } from "@/lib/markdown-plugins";
import { rehypeCollectHeadings, type TocItem } from "@/lib/markdown-toc";
import { CopyButton } from "@/components/ui/markdown/CopyButton";

function extractText(node: ReactNode): string {
    if (typeof node === "string") return node;
    if (typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(extractText).join("");
    if (React.isValidElement<{ children?: ReactNode }>(node)) {
        return extractText(node.props.children);
    }
    return "";
}

interface PreProps extends React.HTMLAttributes<HTMLPreElement> {
    "data-language"?: string;
    children?: ReactNode;
}


const CodeBlock = ({ children, "data-language": language, className, ...props }: PreProps) => {
    if (!language && !className?.includes("shiki")) {
        return <pre className={className} {...props}>{children}</pre>;
    }

    const code = extractText(children).replace(/\n$/, "");
    const languageName = language ? getLinguist(language) : "Plaintext";

    return (
        <div className="relative group bg-surface-muted my-4 rounded-xl border border-border overflow-hidden shadow-xs transition-all">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-surface/50 text-xs font-mono text-muted-foreground">
                <span className="font-medium tracking-wide uppercase">{languageName ?? language}</span>
                <CopyButton code={code} />
            </div>

            <div className="p-3 overflow-x-auto text-sm min-h-10">
                <pre className={`${className ?? ""} bg-transparent! p-0! m-0!`} {...props}>
                    {children}
                </pre>
            </div>
        </div>
    );
};

const markdownComponents: Components & Record<string, React.ElementType> = {
    hr() {
        return <hr className="my-8 border-border" />;
    },
    p({ children }) {
        return <p className="mb-4 leading-relaxed text-foreground">{children}</p>;
    },
    code({ className, children, ...props }: React.ComponentProps<"code"> & { "data-block"?: string }) {
        if ("data-block" in props) {
            return <code className={className} {...props}>{children}</code>;
        }

        return (
            <code
                className={`${className ?? ""} bg-surface-muted text-foreground border border-border-subtle px-1.5 py-0.5 rounded-md text-xs font-mono font-normal inline-block`}
                style={{ fontFamily: "var(--font-geist-mono)" }}
                {...props}
            >
                {children}
            </code>
        );
    },
    pre: CodeBlock,
    input({ type, checked }) {
        return (
            <input
                type={type}
                checked={checked}
                readOnly
                className="mr-2 rounded border-border text-brand accent-brand align-middle focus-ring"
            />
        );
    },
    a(props) {
        const { className, ...rest } = props;
        return (
            <a
                className={`${className ?? ""} text-brand hover:text-brand-hover underline underline-offset-4 decoration-brand/40 hover:decoration-brand font-medium transition-colors wrap-break-word break-all focus-ring rounded-xs`}
                {...rest}
            />
        );
    },
};

export interface MarkdownRendererProps {
    content?: string;
    className?: string;
    headings?: TocItem[];
}

/**
 * Server component: parses and renders markdown here, so the browser receives
 * finished markup instead of the source plus a parser.
 */
export async function MarkdownRenderer({ content, className, headings }: MarkdownRendererProps) {
    const rehype: PluggableList = headings
        ? [...rehypePlugins, [rehypeCollectHeadings, { into: headings }]]
        : rehypePlugins;

    // Must await to render elements for ToC
    const body = await MarkdownAsync({
        remarkPlugins,
        rehypePlugins: rehype,
        components: markdownComponents,
        children: content ?? "",
    });

    return (
        <div
            className={`
                ${className ?? ''} 
                prose dark:prose-invert max-w-none w-full wrap-break-word
                prose-headings:scroll-mt-24
                prose-headings:text-foreground prose-headings:font-semibold prose-headings:tracking-tight prose-h1:mt-8
                prose-h2:text-xl prose-h2:mb-3 prose-li:my-0
                prose-blockquote:border-l-brand prose-blockquote:bg-surface-muted/20 prose-blockquote:py-0.5 prose-blockquote:px-4 prose-blockquote:rounded-r-xl prose-blockquote:not-italic
                prose-img:rounded-xl prose-img:border prose-img:border-border
            `}
        >
            {body}
        </div>
    );
}