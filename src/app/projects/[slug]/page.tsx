import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MarkdownWithToc } from "@/components/ui/markdown/MarkdownWithToC";
import { getProject, imageUrl } from "@/sanity/lib/queries";
import { readingTime } from "@/lib/reading-time";
import { cn } from "cn";
import { ArrowUpRight } from "lucide-react";

interface ProjectPageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
    const { slug } = await params;
    const project = await getProject(slug);

    if (!project) {
        return { title: "Project not found" };
    }

    return {
        title: project.title,
        description: project.summary,
        openGraph: {
            type: "article",
            title: project.title,
            description: project.summary,
        },
    };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
    const { slug } = await params;
    const project = await getProject(slug);

    if (!project) {
        notFound();
    }

    const stats = project.content ? readingTime(project.content) : null;

    return (
        <div className="min-h-screen bg-background text-foreground antialiased">
            <main className="mx-auto flex max-w-7xl flex-col gap-4">
                <Link
                    href="/"
                    className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "max-w-fit")}
                >
                    &lt;- All projects
                </Link>

                <header className="flex flex-col gap-4">
                    <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                        {project.title}
                    </h1>

                    {project.summary && (
                        <p className="text-lg leading-relaxed text-muted-foreground">
                            {project.summary}
                        </p>
                    )}

                    {project.tags && project.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {project.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="font-normal">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                        {stats && (
                            <span className="text-xs text-muted-foreground">
                                {stats.minutes} min read
                            </span>
                        )}

                        {project.githubUrl && (
                            <a
                                href={project.githubUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={buttonVariants({ variant: "outline", size: "sm" })}
                            >
                                Source <ArrowUpRight/>
                            </a>
                        )}

                        {project.liveUrl && (
                            <a
                                href={project.liveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={buttonVariants({ size: "sm" })}
                            >
                                Live <ArrowUpRight/>
                            </a>
                        )}
                    </div>
                </header>

                {project.thumbnail && (
                    <Image
                        src={imageUrl(project.thumbnail)}
                        alt={project.title}
                        width={1600}
                        height={988}
                        priority
                        className="w-full rounded-xl border border-border"
                    />
                )}

                <Separator />

                {project.content ? (
                    <MarkdownWithToc content={project.content} />
                ) : (
                    <p className="text-sm text-muted-foreground">
                        This project doesn&apos;t have a write-up yet.
                    </p>
                )}
            </main>
        </div>
    );
}