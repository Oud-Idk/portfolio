import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

import type { Post } from "@/sanity/lib/queries";

export function BlogCard({ post, index }: { post: Post; index: number }) {
    return (
        <Card
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
                {post.featured && (
                    <p className="text-sm font-semibold w-fit text-success mb-0.5 -mt-1">
                        Featured
                    </p>
                )}
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
    );
}
