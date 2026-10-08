import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MarkdownWithToc } from "@/components/ui/markdown/MarkdownWithToC";
import { ReadingProgress } from "@/components/ReadingProgress";
import { getPost, getPosts, imageUrl } from "@/sanity/lib/queries";
import { readingTime } from "@/lib/reading-time";
import { cn } from "cn";

interface BlogPostPageProps {
    params: Promise<{ slug: string }>;
}

export const revalidate = 60;

export async function generateStaticParams() {
    const posts = await getPosts();
    return posts.filter((post) => post.slug).map((post) => ({ slug: post.slug as string }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
    const { slug } = await params;
    const post = await getPost(slug);

    if (!post) {
        return { title: "Post not found" };
    }

    return {
        title: post.title,
        description: post.excerpt,
        openGraph: {
            type: "article",
            title: post.title,
            description: post.excerpt,
            publishedTime: post.publishedAt,
            authors: post.author ? [post.author] : undefined,
        },
    };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
    const { slug } = await params;
    const post = await getPost(slug);

    if (!post) {
        notFound();
    }

    const stats = post.content ? readingTime(post.content) : null;

    return (
        <div className="min-h-screen bg-background text-foreground antialiased">
            <ReadingProgress />
            <main className="mx-auto flex max-w-7xl flex-col gap-4">
                <Link
                    href="/blog"
                    className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "max-w-fit")}
                >
                    &lt;- All posts
                </Link>

                <header className="flex flex-col">
                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                        {post.title}
                    </h1>

                    {post.excerpt && (
                        <p className="text-lg leading-relaxed text-muted-foreground mt-0.5">
                            {post.excerpt}
                        </p>
                    )}

                    {post.featured && (
                        <p className="text-sm font-semibold w-fit text-success mt-0.5">
                            Featured
                        </p>
                    )}

                    {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {post.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="font-normal">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-muted-foreground mt-1">
                        {post.publishedAt && (
                            <time dateTime={post.publishedAt}>
                                {new Date(post.publishedAt).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })}
                            </time>
                        )}
                        {post.author && <span>By {post.author}</span>}
                        {stats && <span>{stats.minutes} min read</span>}
                    </div>
                </header>

                {post.coverImage && (
                    <Image
                        src={imageUrl(post.coverImage)}
                        alt={post.title}
                        width={1600}
                        height={900}
                        priority
                        className="w-full rounded-xl border border-border"
                    />
                )}

                <Separator />

                {post.content ? (
                    (await MarkdownWithToc({ content: post.content }))
                ) : (
                    <p className="text-sm text-muted-foreground">
                        This post doesn&apos;t have content yet.
                    </p>
                )}
            </main>
        </div>
    );
}
