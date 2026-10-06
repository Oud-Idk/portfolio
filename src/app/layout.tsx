import type { Metadata } from "next";
import Script from "next/script";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/context/ThemeProvider";
import { ReactNode } from "react";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
    preload: false,
});

export const metadata: Metadata = {
    // Used to resolve relative OG/image URLs into absolute ones, which social
    // scrapers require. Set to your public origin (matches the tunnel hostname).
    metadataBase: new URL(
        process.env.NEXT_PUBLIC_SITE_URL ?? "https://oud-idk.dev",
    ),
    title: {
        default: "Dayton Glenn Japaryo - Full-Stack Software Engineer",
        template: "%s — Dayton Japaryo",
    },
    description:
        "Full-stack engineer building fast, accessible web applications. React, Next.js, TypeScript, Node.js, Rust, and PostgreSQL.",
    authors: [{ name: "Dayton Glenn Japaryo", url: "https://oud-idk.dev" }],
    creator: "Dayton Glenn Japaryo",
    openGraph: {
        type: "website",
        locale: "en_US",
        url: "/",
        siteName: "Dayton Japaryo",
        title: "Dayton Glenn Japaryo - Full-Stack Software Engineer",
        description:
            "Full-stack engineer building fast, accessible web applications. React, Next.js, TypeScript, Node.js, Rust, and PostgreSQL.",
    },
    twitter: {
        card: "summary_large_image",
        title: "Dayton Glenn Japaryo - Full-Stack Software Engineer",
        description:
            "Full-stack engineer building fast, accessible web applications. React, Next.js, TypeScript, Node.js, Rust, and PostgreSQL.",
    },
    robots: { index: true, follow: true },
    alternates: {
        types: { "application/atom+xml": "/atom.xml" },
    },
};

interface RootLayoutProps {
    children: ReactNode;
}

const umamiWebsiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

export default function RootLayout({ children }: RootLayoutProps) {
    return (
        <html
            lang="en"
            suppressHydrationWarning
            className={cn("h-full", "antialiased", geistMono.variable, "font-sans", inter.variable)}
        >
        <body className="min-h-full flex flex-col px-12 py-12 selection:bg-brand/50 selection:text-foreground">
        <ThemeProvider
            attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange
        >
            {children}
        </ThemeProvider>
        {umamiWebsiteId && (
            <Script
                src="/umami.js"
                data-website-id={umamiWebsiteId}
                data-do-not-track="true"
                strategy="afterInteractive"
            />
        )}
        </body>
        </html>
    );
}
