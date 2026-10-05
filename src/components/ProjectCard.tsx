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

import type { Project } from "@/sanity/lib/queries";
import { ArrowUpRight } from "lucide-react";

export function ProjectCard({ project, index }: { project: Project; index: number }) {
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
                    {project.slug ? (
                        <Link
                            href={`/projects/${project.slug}`}
                            className="outline-none focus-ring"
                        >
                            {project.title}
                        </Link>
                    ) : (
                        project.title
                    )}
                </CardTitle>
                <CardDescription>
                    {project.summary || "No description provided."}
                </CardDescription>
            </CardHeader>

            <CardContent>
                <div className="flex flex-wrap gap-1.5">
                    {project.tags?.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs font-normal">
                            {tag}
                        </Badge>
                    ))}
                </div>
            </CardContent>

            <CardFooter className="flex justify-end gap-2 border-t pt-4">
                {project.slug && (
                    <Link
                        href={`/projects/${project.slug}`}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                    >
                        Write-up -&gt;
                    </Link>
                )}
                {project.githubUrl && (
                    <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                    >
                        Code
                    </a>
                )}
                {project.liveUrl && (
                    <a
                        href={project.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonVariants({ variant: "default", size: "sm" })}
                    >
                        Live Demo <ArrowUpRight />
                    </a>
                )}
            </CardFooter>
        </Card>
    );
}
