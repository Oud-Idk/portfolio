import Link from "next/link";
import { getPosts, withFeaturedFirst } from "@/sanity/lib/queries";

import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { BlogCard } from "@/components/BlogCard";
import { ArrowUpRight, Rss } from "lucide-react";
import { SiYoutube } from "@icons-pack/react-simple-icons";
import { MarkdownRenderer } from "@/components/ui/markdown/MarkdownRenderer";

export const metadata = {
    title: "Blog",
    description: "Writing on software, web development, and things I learn.",
};

export default async function BlogPage() {
    const posts = withFeaturedFirst(await getPosts());

    return (
        <div className="min-h-screen text-foreground antialiased">
            <main className="mx-auto flex max-w-7xl flex-col gap-8">
                <Link
                    href="/"
                    className={`${buttonVariants({ variant: "ghost", size: "sm" })} max-w-fit`}
                >
                    &lt;- Home
                </Link>

                <header className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Blog</h1>
                    <p className="text-lg leading-relaxed text-muted-foreground">
                        Writing on software, web development, and things I learn.
                    </p>
                    <div className="flex flex-row items-center gap-4">
                        <a
                            href="https://oud-idk.dev/atom.xml"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonVariants({ variant: "outline" })}
                        >
                            <Rss /> <ArrowUpRight/>
                        </a>
                        {(await MarkdownRenderer({ content: "Or go to `https://oud-idk.dev/atom.xml`", className: "-my-4" }))}
                    </div>
                </header>

                <Separator />

                {posts.length === 0 ? (
                    <Card className="border-dashed p-10 text-center bg-transparent">
                        <p className="text-sm text-muted-foreground">
                            No posts yet. Check back soon.
                        </p>
                    </Card>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                        {posts.map((post, index) => (
                            <BlogCard key={post._id} post={post} index={index} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
