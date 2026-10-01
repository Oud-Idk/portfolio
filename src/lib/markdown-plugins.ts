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

/**
 * Single source of truth for the markdown pipeline, consumed server-side by
 * `MarkdownRenderer` (via `react-markdown`'s `MarkdownAsync`).
 *
 * The table of contents is collected from the tree these plugins produce, so a
 * plugin that reshapes headings cannot leave the ToC pointing at ids that no
 * longer exist. The collector is appended by the renderer — it has to run after
 * `rehype-slug`.
 */
export const remarkPlugins: PluggableList = [remarkGfm, remarkMath, remarkBreaks, remarkDirective];

export const rehypePlugins: PluggableList = [
    rehypeRaw,
    rehypeKatex,
    rehypeSlug,
    [rehypeAutolinkHeadings],
    [rehypeExternalLinks, { target: "_blank", rel: ["noopener", "noreferrer"] }],
];