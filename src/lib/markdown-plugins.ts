import type { PluggableList } from "unified";

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
];