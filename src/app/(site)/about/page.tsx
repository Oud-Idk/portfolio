import Link from "next/link";
import type { Metadata } from "next";

import { buttonVariants } from "@/components/ui/button";
import { MarkdownWithToc } from "@/components/ui/markdown/MarkdownWithToC";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = {
    title: "About",
    description: "About Dayton Glenn Japaryo — background, experience, and what I'm looking for.",
};

const aboutContent = `
# About Me

Hi! I'm Dayton Glenn Japaryo, a full-stack developer based in North Sumatra, Indonesia.

# Experience

I am still way too young to have work experience, but I have done some projects for clients.
- SolarTuff Company Profile - https://solartuff.co.id/

# Education

- Sekolah BIM: 2016 - 2026
- Yishun Town Secondary School: 2027 - Future

I got accepted into a [school-based scholarship](https://www.moe.gov.sg/financial-matters/awards-scholarships/asean-scholarship/indonesia) by the MOE, so I'll be moving from Indonesia to Singapore for my studies!

# What I'm looking for

Right now I'm open to freelance work. The easiest way to reach me is email me: [dayton@oud-idk.dev](mailto:dayton@oud-idk.dev).
`;

export default async function AboutPage() {
    return (
        <div className="text-foreground antialiased">
            <main className="mx-auto flex max-w-7xl flex-col gap-8">
                <div className="pointer-events-none absolute top-0 left-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 w-full blur-[90px] h-10 bg-primary/40" />
                <div
                    aria-hidden="true"
                    className="pointer-events-none fixed inset-0 -z-10 h-full w-full opacity-70
                        bg-[radial-gradient(var(--color-border)_1px,transparent_1px)]
                        bg-size-[16px_16px]
                        mask-[radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"
                />
                <Link
                    href="/"
                    className={`${buttonVariants({ variant: "ghost", size: "sm" })} max-w-fit`}
                >
                    &lt;- Home
                </Link>

                {(await MarkdownWithToc({ content: aboutContent, className: "stagger-prose" }))}

                <ContactForm className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400 fill-mode-backwards" />

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
