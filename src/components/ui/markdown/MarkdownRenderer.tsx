import "katex/dist/katex.min.css";

import React, { type ReactNode } from "react";
import type { Element } from "hast";
import { MarkdownAsync, type Components } from "react-markdown";
import type { PluggableList } from "unified";

import { getLinguist } from "@/lib/linguist";
import { rehypePlugins, remarkPlugins } from "@/lib/markdown-plugins";
import { rehypeCollectHeadings, type TocItem } from "@/lib/markdown-toc";
import { CopyButton } from "@/components/ui/markdown/CopyButton";
import { normalizeLanguage, Prism as SyntaxHighlighter, vscDarkPlus } from "@/components/ui/markdown/prism";

interface CodeElementProps {
    className?: string;
    children?: ReactNode;
}

interface PreProps extends React.HTMLAttributes<HTMLPreElement> {
    _node?: Element;
    className?: string;
    children?: ReactNode;
}

const CodeBlock = ({ children, ...props }: PreProps) => {
    const child = React.Children.toArray(children)[0];

    if (React.isValidElement<CodeElementProps>(child)) {
        const className = child.props.className;
        const match = typeof className === "string" ? /language-(\S+)/.exec(className) : null;
        const fence = match?.[1] ?? "";

        const rawChildren = child.props.children;
        const code = typeof rawChildren === "string"
            ? rawChildren
            : Array.isArray(rawChildren)
                ? rawChildren.filter((c): c is string => typeof c === "string").join("")
                : "";

        const language = normalizeLanguage(fence);
        const languageName = getLinguist(fence);

        return (
            <div className="relative group bg-surface-muted my-4 rounded-xl border border-border overflow-hidden shadow-xs transition-all">
                <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-surface/50 text-xs font-mono text-muted-foreground">
                    <span className="font-medium tracking-wide uppercase">{languageName ?? "Plaintext"}</span>
                    <CopyButton code={code} />
                </div>

                {/* Highlighting is plain rendering, not interaction, so it runs here
                    on the server and never ships the grammars to the browser. */}
                <div className="p-3 overflow-x-auto text-sm min-h-[2.5rem]">
                    <SyntaxHighlighter
                        {...(language !== null ? { language } : {})}
                        style={vscDarkPlus}
                        customStyle={{ padding: "0", margin: "0", background: "transparent" }}
                    >
                        {code.replace(/\n$/, "")}
                    </SyntaxHighlighter>
                </div>
            </div>
        );
    }

    return <pre className="..." {...props}>{children}</pre>;
};

const markdownComponents: Components & Record<string, React.ElementType> = {
    hr() {
        return <hr className="my-8 border-border" />;
    },
    p({ children }) {
        // Fast path: avoid expensive deep flattening/cloning for pure text nodes
        if (typeof children === "string" || typeof children === "number") {
            return <p className="my-1! mb-2! leading-relaxed text-foreground last:mb-0">{children}</p>;
        }

        // Only inspect complex children if block-level elements could be nested
        const hasBlockChild = React.Children.toArray(children).some(
            (child) => React.isValidElement(child) && (child.type === CodeBlock || child.type === "div")
        );

        if (hasBlockChild) {
            return <>{children}</>;
        }
        return <p className="my-1! mb-2! leading-relaxed text-foreground last:mb-0">{children}</p>;
    },
    code({ className, children, ...props }) {
        return (
            <code
                className={`${className ?? ""} bg-surface-muted text-foreground border border-border-subtle px-1.5 py-0.5 rounded-md text-xs font-mono font-normal inline-block`}
                style={{ fontFamily: 'var(--font-geist-mono)' }}
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
    /**
     * Out-param: when an array is passed, the heading outline is written to it as
     * the document renders. Lets a caller show a ToC without parsing twice.
     */
    headings?: TocItem[];
}

/**
 * Server component: parses and renders markdown here, so the browser receives
 * finished markup instead of the source plus a parser.
 */
export async function MarkdownRenderer({ content, className, headings }: MarkdownRendererProps) {
    // Must run last: the outline is read off the ids `rehype-slug` mints.
    const rehype: PluggableList = headings
        ? [...rehypePlugins, [rehypeCollectHeadings, { into: headings }]]
        : rehypePlugins;

    // Called rather than rendered as `<MarkdownAsync />`: a component element
    // holds an unrun promise, so awaiting this is what actually finishes the
    // pipeline — which is also what fills in `headings` for the caller.
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
                prose-headings:text-foreground prose-headings:font-semibold prose-headings:tracking-tight
                prose-h1:text-4xl prose-h1:mt-8 prose-h1:mb-4 prose-h1:first:mt-0
                prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3
                prose-h3:text-lg prose-h3:mt-5 prose-h3:mb-2
                prose-ul:my-0 prose-ol:my-4 prose-li:my-0 prose-li:text-foreground
                prose-blockquote:border-l-brand prose-blockquote:bg-surface-muted/20 prose-blockquote:py-0.5 prose-blockquote:px-4 prose-blockquote:rounded-r-xl prose-blockquote:not-italic prose-blockquote:my-4
                prose-img:rounded-xl prose-img:border prose-img:border-border prose-img:my-6
            `}
        >
            {body}
        </div>
    );
}