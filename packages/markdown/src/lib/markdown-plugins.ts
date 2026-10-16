import type { PluggableList } from "unified";
import type { Root } from "hast";
import type { Root as mdastRoot } from "mdast";
import { visit } from "unist-util-visit";

import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import remarkDirective from "remark-directive";
import type { Root as MdastRoot } from "mdast";

/**
 * Turns `:::sidebyside` container directives into a `<div class="sidebyside">`
 * via mdast-util-to-hast's `data.hName`/`data.hProperties` passthrough.
 */
const remarkSideBySide = () => (tree: MdastRoot) => {
    visit(tree, (node) => {
        if (
            node.type === "containerDirective" &&
            (node as { name?: string }).name === "sidebyside"
        ) {
            const n = node as unknown as { data?: Record<string, unknown> };
            n.data = n.data ?? {};
            n.data.hName = "div";
            n.data.hProperties = { className: "sidebyside" };
        }
    });
};

/** Baseline intrinsic size for `:::video`, used to reserve layout space (CLS). */
const DEFAULT_VIDEO_WIDTH = 1600;
const DEFAULT_VIDEO_HEIGHT = 900;

interface DirectiveNode {
    type: string;
    name?: string;
    attributes?: Record<string, string | null | undefined>;
    children?: Array<{
        type?: string;
        value?: string;
        url?: string;
        children?: Array<{ type?: string; value?: string; url?: string }>;
    }>;
    data?: Record<string, unknown>;
}

const VIDEO_EXTENSION = /\.(?:mp4|webm|ogv|mov|m4v)(?:[?#].*)?$/i;

function videoBodySource(children: DirectiveNode["children"]): string | undefined {
    const paragraph = children?.find((child) => child.type === "paragraph");
    for (const child of paragraph?.children ?? []) {
        const candidate =
            child.type === "link" && child.url
                ? child.url
                : child.type === "text"
                    ? child.value?.trim()
                    : undefined;

        if (candidate && VIDEO_EXTENSION.test(candidate)) {
            return candidate;
        }
    }
    return undefined;
}

const parseBool = (val: string | null | undefined, fallback: boolean): boolean => {
    if (val === undefined || val === null) return fallback;
    return val !== "false";
};

export const remarkVideo = () => (tree: mdastRoot) => {
    visit(tree, (node) => {
        if (node.type !== "containerDirective" && node.type !== "leafDirective") return;

        const directive = node as unknown as DirectiveNode;
        if (directive.name !== "video") return;

        const attrs = directive.attributes ?? {};
        const src = attrs.src?.trim() || videoBodySource(directive.children);
        if (!src) return;

        const classes = ["video-embed"];
        if (attrs.class) classes.push(...attrs.class.split(" ").filter(Boolean));

        const properties: Record<string, unknown> = {
            className: classes,
            src,
            width: Number(attrs.width) || DEFAULT_VIDEO_WIDTH,
            height: Number(attrs.height) || DEFAULT_VIDEO_HEIGHT,
            autoPlay: parseBool(attrs.autoplay ?? attrs.autoPlay, true),
            muted: parseBool(attrs.muted, true),
            loop: parseBool(attrs.loop, true),
            playsInline: parseBool(attrs.playsinline ?? attrs.playsInline, true),
            preload: attrs.preload || "metadata",
        };

        if (attrs.id) properties.id = attrs.id;
        if (attrs.poster) properties.poster = attrs.poster;
        if (attrs.alt) {
            properties.title = attrs.alt;
            properties["aria-label"] = attrs.alt;
        }
        if ("controls" in attrs) {
            properties.controls = parseBool(attrs.controls, true);
        }

        directive.children = [];
        directive.data = directive.data ?? {};
        directive.data.hName = "video";
        directive.data.hProperties = properties;
    });
};

import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExternalLinks from "rehype-external-links";
import rehypeShiki from "@shikijs/rehype";
import type { ShikiTransformer } from "shiki";

const languageTransformer: ShikiTransformer = {
    name: "language-badge",
    pre(node) {
        node.properties["data-language"] = this.options.lang;
    },
    code(node) {
        node.properties["data-block"] = "";
    },
};

/**
 * react-markdown funnels *every* `code` element through our `code` component
 * override, so the inline-code pill (background, border, padding, radius) also
 * lands on the `code` nested inside a fenced block. The shiki transformer tags
 * highlighted blocks with `data-block` to opt out, but a block with no language
 * never reaches shiki and so is never tagged — it renders as a bordered pill
 * sitting inside its own `<pre>`. Tag every `pre > code` here instead, running
 * after shiki so highlighted output is covered too.
 */
const rehypeMarkBlockCode = () => (tree: Root) => {
    visit(tree, "element", (node) => {
        if (node.tagName !== "pre") return;

        for (const child of node.children) {
            if (child.type === "element" && child.tagName === "code") {
                child.properties["data-block"] = "";
            }
        }
    });
};

export const remarkPlugins: PluggableList = [remarkGfm, remarkMath, remarkBreaks, remarkDirective, remarkSideBySide, remarkVideo];

export function hasMath(content: string | undefined | null): boolean {
    return /\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/.test(content ?? "");
}

export function rehypePluginsFor(content: string | undefined | null): PluggableList {
    return [
        rehypeRaw,
        ...(hasMath(content) ? [rehypeKatex] : []),
        rehypeSlug,
        [rehypeAutolinkHeadings],
        [rehypeExternalLinks, { target: "_blank", rel: ["noopener", "noreferrer"] }],
        [
            rehypeShiki,
            {
                themes: {
                    light: "light-plus",
                    dark: "dark-plus",
                },
                transformers: [languageTransformer],
            },
        ],
        rehypeMarkBlockCode,
    ];
}