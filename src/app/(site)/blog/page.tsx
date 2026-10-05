import Link from "next/link";
import { getPosts } from "@/sanity/lib/queries";

import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { BlogCard } from "@/components/BlogCard";

export const metadata = {
    title: "Blog",
    description: "Writing on software, web development, and things I learn.",
};

export default async function BlogPage() {
    const posts = await getPosts();

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
