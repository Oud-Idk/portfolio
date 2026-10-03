import type { PluggableList } from "unified";
import type { Root } from "hast";
import { visit } from "unist-util-visit";

import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import remarkDirective from "remark-directive";

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

export const remarkPlugins: PluggableList = [remarkGfm, remarkMath, remarkBreaks, remarkDirective];

export const rehypePlugins: PluggableList = [
    rehypeRaw,
    rehypeKatex,
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