import Link from "next/link";
import { getProjects } from "@/sanity/lib/queries";

// shadcn components
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
import { MarkdownRenderer } from "@/components/ui/markdown/MarkdownRenderer";
import { TypingQuote } from "@/components/TypingQuote";
import { ArrowUpRight } from "lucide-react";

const mainContent = `
## Full-Stack Developer

I make high-performance web applications with emphasis on reliability, durability, accessibility, speed.

Most web applications are filled with needless complexity and distracting elements, leading to slow loading times, reduced performance, and accessibility issues, which doesn't retain users, and therefore, leads to lost revenue. My approach is **pragmatic**: simple enough to be universal while elegant enough to keep users hooked.
`;

const otherContent = `
### Values
- **Speed & Performance**. A fast website retains more users.
- **Universal Accessibility**. A great product should be usable by everyone.
- **Clean, Maintainable Architecture**. I prioritize clear and dependable code over fragile, 'smart' shortcuts.
- **Reliable**: Graceful failure handling.

## Technical Competencies

- **Frontend Development:** React, Next.js, TypeScript, Tailwind CSS, Component Systems
- **Backend & Data Architecture:** Node.js, Rust, PostgreSQL, MongoDB, RESTful & GraphQL APIs
- **Content Management & Workflow:** Sanity CMS, Git, Linux Environments

## The Approach

> *"Simplicity is prerequisite for reliability."* - Edsger W. Dijkstra

The best software doesn’t call attention to its complexity. The best one simply works. Whether that means a dashboard or a company profile, my goal is to deliver intuitive, resilient tools that respect your users' time.

This website is a living example of my philosophy. I can write something like this, and it will still load instantly.

$$
\\frac{\\partial \\mathbf{u}}{\\partial t} + (\\mathbf{u} \\cdot \\nabla)\\mathbf{u} = -\\frac{1}{\\rho}\\nabla p + \\nu \\nabla^2 \\mathbf{u} + \\mathbf{f}
$$
`

export default async function Home() {
    const projects = await getProjects();

    return (
        <div className="min-h-screen text-foreground antialiased">
            <div className="pointer-events-none absolute top-0 left-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 w-full blur-[90px] h-10 bg-primary/40" />

            <div
                aria-hidden="true"
                className="pointer-events-none fixed inset-0 -z-10 h-full w-full opacity-70
                bg-[radial-gradient(var(--color-border)_1px,transparent_1px)]
                bg-size-[16px_16px]
                mask-[radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"
            />
            <main className="mx-auto flex max-w-7xl flex-col gap-8">
                <section className="flex flex-col items-start gap-2">
                    <h1 className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-backwards motion-reduce:animate-none text-3xl font-bold tracking-tight sm:text-4xl">
                        Hi, I&apos;m Dayton Glenn Japaryo.
                    </h1>

                    <TypingQuote />

                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 fill-mode-backwards motion-reduce:animate-none flex items-center gap-4">
                        <a
                            href="mailto:dayton@oud-idk.dev"
                            className={buttonVariants()}
                        >
                            Get in touch
                        </a>

                        <a
                            href="https://github.com/Oud-Idk"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonVariants({ variant: "outline" })}
                        >
                            GitHub <ArrowUpRight/>
                        </a>
                        <MarkdownRenderer content="Or email `dayton@oud-idk.dev`" className="-my-4"/>
                    </div>
                </section>

                <MarkdownRenderer content={mainContent} className="stagger-prose" />

                <Separator />

                <section className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold tracking-tight">Some Projects</h2>
                        </div>

                        <Link
                            href="/studio"
                            className={buttonVariants({ variant: "ghost", size: "sm" })}
                        >
                            CMS Studio <ArrowUpRight/>
                        </Link>
                    </div>

                    {projects.length === 0 ? (
                        <Card className="border-dashed p-10 text-center bg-transparent">
                            <p className="text-sm text-muted-foreground">
                               No projects... sadly
                            </p>
                        </Card>
                    ) : (
                        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                            {projects.map((project, index) => (
                                <Card
                                    key={project._id}
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
                                                Live Demo <ArrowUpRight/>
                                            </a>
                                        )}
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </section>

                <Separator />

                <MarkdownRenderer content={otherContent} className="stagger-prose" />

                <footer className="flex items-center justify-between border-t border-border pt-8 text-xs text-muted-foreground">
                    <p>© {new Date().getFullYear()} Oud • Built with Next.js & Sanity</p>
                    <div className="flex gap-4">
                        <a href="https://github.com/Oud-Idk" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                            GitHub
                        </a>
                        <a href="mailto:dayton@oud-idk.dev" className="hover:text-foreground">
                            Email
                        </a>
                    </div>
                </footer>

            </main>
        </div>
    );
}