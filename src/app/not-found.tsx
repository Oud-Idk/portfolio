import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-background text-foreground antialiased">
            <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 text-center">
                <p className="text-sm font-medium text-muted-foreground">404</p>

                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    This page doesn&apos;t exist
                </h1>

                <p className="text-muted-foreground">
                    The link may be broken, or the project may have been unpublished.
                </p>

                <Link href="/" className={buttonVariants()} >
                    Back home
                </Link>
            </main>
        </div>
    );
}