const WORDS_PER_MINUTE = 225;

/**
 * Reading time for a markdown document. Code fences and HTML comments are
 * stripped first so a wall of SQL doesn't inflate the estimate.
 */
export function readingTime(markdown: string): { words: number; minutes: number } {
    const cleaned = markdown
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/```[\s\S]*?```/g, "")
        .trim();

    const words = cleaned.split(/\s+/).filter(Boolean).length;

    return { words, minutes: Math.max(1, Math.ceil(words / WORDS_PER_MINUTE)) };
}