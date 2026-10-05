import Link from "next/link";
import { getProjects, getPosts } from "@/sanity/lib/queries";

// shadcn components
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { ProjectCard } from "@/components/ProjectCard";
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

The best software doesn’t show off. The best one simply works. Whether that means a dashboard, a company profile, or a portfolio, my goal is to deliver intuiitive tools that respect your users' time.

This website is a living example of my philosophy. I can write something like this, and it will still load instantly.

$$
\\frac{\\partial \\mathbf{u}}{\\partial t} + (\\mathbf{u} \\cdot \\nabla)\\mathbf{u} = -\\frac{1}{\\rho}\\nabla p + \\nu \\nabla^2 \\mathbf{u} + \\mathbf{f}
$$
`

export default async function Home() {
    const projects = await getProjects();
    const recentPosts = (await getPosts()).slice(0, 5);

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
                        {(await MarkdownRenderer({ content: "Or email `dayton@oud-idk.dev`", className: "-my-4" }))}
                    </div>
                </section>

                {(await MarkdownRenderer({ content: mainContent, className: "stagger-prose" }))}

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
                                <ProjectCard key={project._id} project={project} index={index} />
                            ))}
                        </div>
                    )}
                </section>

                <Separator />

                {(await MarkdownRenderer({ content: otherContent, className: "stagger-prose" }))}

                <Separator />

                <section className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold tracking-tight">Recent Blogs</h2>

                        <Link
                            href="/blog"
                            className={buttonVariants({ variant: "ghost", size: "sm" })}
                        >
                            All posts -&gt;
                        </Link>
                    </div>

                    {recentPosts.length === 0 ? (
                        <Card className="border-dashed p-10 text-center bg-transparent">
                            <p className="text-sm text-muted-foreground">
                                No posts yet. Check back soon.
                            </p>
                        </Card>
                    ) : (
                        <ul className="flex flex-col divide-y divide-border">
                            {recentPosts.map((post) => (
                                <li key={post._id} className="flex items-baseline justify-between gap-4 py-3">
                                    <Link
                                        href={post.slug ? `/blog/${post.slug}` : "/blog"}
                                        className="text-link hover:text-link-hover underline underline-offset-4 decoration-link/40 hover:decoration-link-hover font-medium transition-colors wrap-break-word break-all focus-ring rounded-xs"
                                    >
                                        {post.title}
                                    </Link>
                                    {post.publishedAt && (
                                        <time
                                            dateTime={post.publishedAt}
                                            className="shrink-0 text-xs text-muted-foreground"
                                        >
                                            {new Date(post.publishedAt).toLocaleDateString("en-US", {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                            })}
                                        </time>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

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