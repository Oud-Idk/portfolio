"use client";

import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { BlogCard } from "@/components/BlogCard";

import type { Post } from "@/sanity/lib/queries";

interface SearchHit {
    id: string;
    title: string;
    slug?: string;
    excerpt?: string;
    tags?: string[];
    author?: string;
    publishedAt?: string;
    featured?: boolean;
}

export function BlogExplorer({ posts }: { posts: Post[] }) {
    const [query, setQuery] = useState("");
    const [hits, setHits] = useState<SearchHit[] | null>(null);
    const [loading, setLoading] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        const q = query.trim();
        if (!q) return;

        const timer = setTimeout(async () => {
            setLoading(true);
            setHits(null);
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
                    signal: controller.signal,
                });
                if (!res.ok) throw new Error(String(res.status));
                const data = await res.json();
                setHits(data.hits ?? []);
            } catch (error) {
                if ((error as Error).name !== "AbortError") {
                    setHits([]);
                }
            } finally {
                if (abortRef.current === controller) setLoading(false);
            }
        }, 800);

        return () => clearTimeout(timer);
    }, [query]);

    const searchedQuery = query.trim();

    return (
        <div className="flex flex-col gap-6">
            <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search posts…"
                aria-label="Search blog posts"
                className="max-w-md"
            />

            {!searchedQuery ? (
                posts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No posts yet. Check back soon.</p>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                        {posts.map((post, index) => (
                            <BlogCard key={post._id} post={post} index={index} />
                        ))}
                    </div>
                )
            ) : loading || hits === null ? (
                <p className="text-sm text-muted-foreground">Searching…</p>
            ) : hits.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    No results for “{query.trim()}”.
                </p>
            ) : (
                <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                    {hits.map((hit, index) => (
                        <BlogCard
                            key={hit.id}
                            index={index}
                            post={{
                                _id: hit.id,
                                title: hit.title,
                                slug: hit.slug,
                                excerpt: hit.excerpt,
                                tags: hit.tags,
                                author: hit.author,
                                publishedAt: hit.publishedAt,
                                featured: hit.featured,
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
