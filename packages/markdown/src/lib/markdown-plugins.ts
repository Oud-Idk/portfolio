import type { PluggableList } from "unified";
import type { Root } from "hast";
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

/**
 * Pulls the video URL out of a `:::video` body: the first link or text node of
 * the first paragraph. remark-gfm autolinks bare URLs, so a pasted URL arrives
 * as a `link` rather than `text`. Body text only counts when it is addressable
 * — a URL, a root-relative path, or a media filename — so a stray paragraph
 * inside `:::video` can't be mistaken for the source.
 */
const VIDEO_SOURCE = /^(?:https?:\/\/|\/|\.{1,2}\/)/i;
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

        if (candidate && (VIDEO_SOURCE.test(candidate) || VIDEO_EXTENSION.test(candidate))) {
            return candidate;
        }
    }
    return undefined;
}

/**
 * Turns `:::video` container directives into a `<video>` element.
 *
 * Defaults mirror an animated GIF — muted, looping, autoplaying, inline — so a
 * heavy GIF can be swapped for an mp4/webm without changing how the post reads.
 * `width`/`height` become intrinsic dimensions so the browser reserves the box
 * before metadata arrives (no layout shift); pass them when the clip isn't 16:9.
 *
 *   :::video{src="…/demo.mp4" poster="…/demo.jpg" alt="Demo of the app"}
 *   :::
 *
 * The URL may also be the body, which remark-gfm autolinks:
 *
 *   :::video
 *   https://…/demo.mp4
 *   :::
 *
 * Add `controls` for a normal player instead of a GIF-like embed.
 */
export const remarkVideo = () => (tree: MdastRoot) => {
    visit(tree, (node) => {
        if (node.type !== "containerDirective") return;

        const directive = node as unknown as DirectiveNode;
        if (directive.name !== "video") return;

        // Attributes win over the body, so a stray caption can't shadow `src`.
        const attrs = directive.attributes ?? {};
        const src = attrs.src?.trim() || videoBodySource(directive.children);
        if (!src) return;

        // Only set keys we have values for: an undefined `poster`/`src` would be
        // emitted as an empty attribute, which browsers take literally.
        const properties: Record<string, unknown> = {
            className: attrs.class ? `video-embed ${attrs.class}` : "video-embed",
            src,
            width: Number(attrs.width) || DEFAULT_VIDEO_WIDTH,
            height: Number(attrs.height) || DEFAULT_VIDEO_HEIGHT,
            autoPlay: true,
            muted: true,
            loop: true,
            playsInline: true,
            preload: "metadata",
        };

        if (attrs.id) properties.id = attrs.id;
        if (attrs.poster) properties.poster = attrs.poster;
        if (attrs.alt) {
            properties.title = attrs.alt;
            properties["aria-label"] = attrs.alt;
        }
        if ("controls" in attrs) properties.controls = true;

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