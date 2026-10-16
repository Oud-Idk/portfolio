import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { UploadPanel } from "@/components/UploadPanel";
import { buttonVariants } from "@/components/ui/button";
import { ACCESS_JWT_HEADER, verifyAccessToken } from "@/lib/cloudflare-access";

// Access has to be checked per request, not at build time — the Docker image is
// built with no tunnel in front of it and is proxied at runtime.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Uploads",
    robots: { index: false, follow: false },
};

export default async function UploadsPage() {
    // Cloudflare Access challenges before the request ever reaches us, so this
    // only fires for something that got to the origin some other way — for
    // which the page should not exist. The API routes re-check independently.
    const headerList = await headers();
    const identity = await verifyAccessToken(headerList.get(ACCESS_JWT_HEADER));
    if (!identity) notFound();

    return (
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-8">
            <Link
                href="/"
                className={`${buttonVariants({ variant: "ghost", size: "sm" })} max-w-fit`}
            >
                &lt;- Home
            </Link>

            <header className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Uploads</h1>
                <p className="text-lg leading-relaxed text-muted-foreground">
                    Push a poster, image, or video to object storage and copy the URL or
                    markdown it hands back.
                </p>
            </header>

            <UploadPanel />
        </main>
    );
}
