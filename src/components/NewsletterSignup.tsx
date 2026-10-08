"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { subscribeToNewsletter } from "@/app/actions/newsletter";
import { cn } from "cn";

export function NewsletterSignup({ className }: { className?: string }) {
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        setStatus("loading");
        setErrorMessage(null);

        const formData = new FormData(e.currentTarget);
        const result = await subscribeToNewsletter(formData);

        if ("error" in result && result.error) {
            setErrorMessage(result.error);
            setStatus("error");
        } else {
            setStatus("success");
        }
    }

    if (status === "success") {
        return (
            <Card className="p-8 text-center bg-card/60 backdrop-blur-sm">
                <CardTitle className="text-xl">You&apos;re subscribed!</CardTitle>
                <CardDescription className="mt-1">
                    Thanks for subscribing! You&apos;ll hear from me when new posts go live.
                </CardDescription>
                <div className="mt-4">
                    <Button variant="ghost" size="sm" onClick={() => setStatus("idle")}>
                        Subscribe another email
                    </Button>
                </div>
            </Card>
        );
    }

    return (
        <Card className={cn("relative overflow-hidden bg-card/50 backdrop-blur-sm", className)}>
            <CardHeader>
                <CardTitle className="text-2xl font-bold tracking-tight">
                    Join the mailing list
                </CardTitle>
                <CardDescription>
                    Get new posts delivered to your inbox. No spam, unsubscribe anytime.
                </CardDescription>
            </CardHeader>

            <CardContent>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="newsletter-email">Email</Label>
                        <Input
                            id="newsletter-email"
                            name="email"
                            type="email"
                            required
                            placeholder="john@example.com"
                        />
                    </div>

                    {status === "error" && errorMessage && (
                        <p className="text-xs font-medium text-destructive">{errorMessage}</p>
                    )}

                    <Button
                        type="submit"
                        disabled={status === "loading"}
                        className="w-full sm:w-auto self-start"
                        data-umami-event="subscribe-newsletter"
                    >
                        {status === "loading" ? "Subscribing..." : "Subscribe"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
