import Link from "next/link";
import { getPosts } from "@/sanity/lib/queries";

import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from "@/components/ui/card";

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
                            <Card
                                key={post._id}
                                style={{ animationDelay: `${150 + Math.min(index, 8) * 75}ms` }}
                                className="group flex flex-col justify-between transition-all duration-300 ease-out
                                hover:-translate-y-1 motion-reduce:transition-none
                                motion-reduce:hover:translate-y-0 animate-in fade-in slide-in-from-bottom-4
                                fill-mode-backwards motion-reduce:animate-none border hover:border-foreground
                                hover:shadow-foreground hover:shadow-[0px_0px_34px_-15px_rgba(0,0,0,0.1)]
                                motion-reduce:hover:shadow-md motion-reduce:hover:shadow-background
                                motion-reduce:hover:border-border"
                            >
                                <CardHeader>
                                    <CardTitle className="text-lg font-semibold">
                                        {post.slug ? (
                                            <Link
                                                href={`/blog/${post.slug}`}
                                                className="outline-none focus-ring"
                                            >
                                                {post.title}
                                            </Link>
                                        ) : (
                                            post.title
                                        )}
                                    </CardTitle>
                                    <CardDescription>
                                        {post.excerpt || "No excerpt provided."}
                                    </CardDescription>
                                </CardHeader>

                                <CardContent>
                                    <div className="flex flex-wrap gap-1.5">
                                        {post.tags?.map((tag) => (
                                            <Badge key={tag} variant="secondary" className="text-xs font-normal">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>

                                <CardFooter className="flex items-center justify-between gap-2 border-t pt-4">
                                    {post.publishedAt && (
                                        <time
                                            dateTime={post.publishedAt}
                                            className="text-xs text-muted-foreground"
                                        >
                                            {new Date(post.publishedAt).toLocaleDateString("en-US", {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                            })}
                                        </time>
                                    )}
                                    {post.slug && (
                                        <Link
                                            href={`/blog/${post.slug}`}
                                            className={buttonVariants({ variant: "ghost", size: "sm" })}
                                        >
                                            Read -&gt;
                                        </Link>
                                    )}
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
