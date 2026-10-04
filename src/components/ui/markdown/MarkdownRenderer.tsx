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

/**
 * react-markdown passes every component override the hast `node` alongside the
 * real DOM props. Spreading it through emits `node="[object Object]"` into the
 * markup, so drop it once, here, instead of at each call site.
 */
function withoutNode<T extends { node?: unknown }>(props: T): Omit<T, "node"> {
    const { node, ...rest } = props;
    void node;
    return rest;
}

interface PreProps extends React.HTMLAttributes<HTMLPreElement> {
    "data-language"?: string;
    children?: ReactNode;
    /** react-markdown's AST node. Never a valid DOM attribute — must be dropped. */
    node?: unknown;
}


const CodeBlock = (raw: PreProps) => {
    const { children, className, "data-language": language, ...props } = withoutNode(raw);

    if (!language && !className?.includes("shiki")) {
        return (
            <pre className={`${className ?? ""} border border-border rounded-xl`} {...props}>
                {children}
            </pre>
        );
    }

    const code = extractText(children).replace(/\n$/, "");
    const languageName = language ? getLinguist(language) : "Plaintext";

    return (
        <div className="relative group bg-surface my-4 rounded-xl border border-border overflow-hidden shadow-xs transition-all">
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
    code(raw: React.ComponentProps<"code"> & { "data-block"?: string; node?: unknown }) {
        const { className, children, ...props } = withoutNode(raw);

        if ("data-block" in props) {
            return <code className={className} {...props}>{children}</code>;
        }

        return (
            <code
                className={`${className ?? ""} bg-surface text-foreground border border-border px-1.5 py-0.5 rounded-md text-xs font-mono font-normal inline-block`}
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
    a(raw: React.ComponentProps<"a"> & { node?: unknown }) {
        const { className, ...props } = withoutNode(raw);

        return (
            <a
                className={`${className ?? ""} text-link hover:text-link-hover underline underline-offset-4 decoration-link/40 hover:decoration-link-hover font-medium transition-colors wrap-break-word break-all focus-ring rounded-xs`}
                {...props}
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
/**
 * Cross-request cache of rendered markdown. The Shiki highlighter and KaTeX
 * are expensive (~1s+ cold each), and the body copy rarely changes, so we
 * render once per unique (content, headings) key and reuse the elements.
 */
const markdownCache = new Map<string, Promise<{ body: ReactNode; headings: TocItem[] }>>();

function getMarkdownBody(content: string, headings?: TocItem[]): Promise<ReactNode> {
    return getMarkdown(content, headings !== undefined).then((r) => {
        if (headings !== undefined) headings.push(...r.headings);
        return r.body;
    });
}

function getMarkdown(content: string, collectToc: boolean): Promise<{ body: ReactNode; headings: TocItem[] }> {
    const key = `${collectToc ? "toc" : "plain"}:${content}`;
    let hit = markdownCache.get(key);
    if (!hit) {
        const collected: TocItem[] = [];
        const rehype: PluggableList = collectToc
            ? [...rehypePlugins, [rehypeCollectHeadings, { into: collected }]]
            : rehypePlugins;

        hit = MarkdownAsync({
            remarkPlugins,
            rehypePlugins: rehype,
            components: markdownComponents,
            children: content,
        }).then((body) => ({ body, headings: collected }));
        hit.catch(() => markdownCache.delete(key));
        markdownCache.set(key, hit);
    }
    return hit;
}

export async function MarkdownRenderer({ content, className, headings }: MarkdownRendererProps) {
    // Must await to render elements for ToC
    const body = await getMarkdownBody(content ?? "", headings);

    return (
        <div
            className={`
                ${className ?? ''} 
                prose dark:prose-invert max-w-none w-full wrap-break-word
                prose-headings:scroll-mt-24
                prose-headings:text-foreground prose-headings:font-semibold prose-headings:tracking-tight prose-h1:mt-8
                prose-h2:text-xl prose-h2:mb-3 prose-li:my-0
                prose-blockquote:border-l-brand prose-blockquote:py-0.5 prose-blockquote:px-4 prose-blockquote:rounded-r-xl prose-blockquote:not-italic
                prose-pre:bg-surface
                prose-img:rounded-xl prose-img:border prose-img:border-border
            `}
        >
            {body}
        </div>
    );
}