import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Unsubscribe",
};

export default function UnsubscribePage() {
    return (
        <main className="mx-auto flex max-w-lg flex-col gap-4 py-16">
            <h1 className="text-3xl font-bold tracking-tight">Unsubscribe</h1>
            <p className="text-muted-foreground">
                Enter your email and you won&apos;t hear from the mailing list again.
            </p>
            <form action="/api/unsubscribe" method="get" className="flex flex-col gap-4">
                <input
                    type="email"
                    name="email"
                    required
                    placeholder="john@example.com"
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
                <button
                    type="submit"
                    className="w-fit rounded-md border border-border bg-surface px-5 py-2.5 text-sm font-bold"
                >
                    Unsubscribe
                </button>
            </form>
        </main>
    );
}
