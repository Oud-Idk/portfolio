import type { Metadata } from "next";
import { UnsubscribeForm } from "@/components/UnsubscribeForm";

export const metadata: Metadata = {
    title: "Unsubscribe",
};

export default function UnsubscribePage() {
    return (
        <main className="mx-auto flex max-w-lg flex-col gap-4 py-16">
            <h1 className="text-3xl font-bold tracking-tight">Unsubscribe</h1>
            <p className="text-muted-foreground">
                Enter your email and we&apos;ll send you a link to confirm. Nothing changes
                until you click it, which means nobody else can unsubscribe you by
                knowing your address.
            </p>
            <UnsubscribeForm />
        </main>
    );
}