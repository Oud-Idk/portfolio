import { visit } from "unist-util-visit";
import { headingRank } from "hast-util-heading-rank";
import { toString } from "hast-util-to-string";
import type { Element, Root } from "hast";

export interface TocItem {
    id: string;
    text: string;
    level: number;
}

/** Deepest heading level the ToC lists; matches the old `h1, h2, h3, h4` query. */
const MAX_LEVEL = 4;

interface CollectHeadingsOptions {
    /** Array the outline is written to, in document order. */
    into: TocItem[];
}

/**
 * Collects the heading outline while the document is being rendered, so the
 * ToC and the document come out of a single parse of the markdown.
 *
 * Server-side only: wire it in after `rehype-slug` (it reads the ids that
 * plugin mints) via `[rehypeCollectHeadings, { into }]`.
 */
export function rehypeCollectHeadings({ into }: CollectHeadingsOptions) {
    return (tree: Root): void => {
        visit(tree, "element", (node: Element) => {
            const level = headingRank(node);
            if (level == null || level > MAX_LEVEL) {
                return;
            }

            // `rehype-slug` only fills in missing ids, so a heading written as
            // raw HTML keeps its own — read it rather than re-slugging the text.
            const id = node.properties.id;
            if (typeof id !== "string" || id.trim() === "") {
                return;
            }

            const text = toString(node);
            if (text.trim() === "") {
                return;
            }

            into.push({ id, text, level });
        });
    };
}