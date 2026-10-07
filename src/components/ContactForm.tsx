"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { sendContactEmail } from "@/app/actions/contact";
import { cn } from "cn";

export function ContactForm({className}: {className?: string}) {
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        setStatus("loading");

        const formData = new FormData(e.currentTarget);

        try {
            await sendContactEmail(formData);
            setStatus("success");
        } catch {
            setStatus("error");
        }
    }

    if (status === "success") {
        return (
            <Card className="p-8 text-center bg-card/60 backdrop-blur-sm">
                <CardTitle className="text-xl">Message sent! 🎉</CardTitle>
                <CardDescription className="mt-1">
                    Thanks for reaching out, I&apos;ll get back to you soon!
                </CardDescription>
                <div className="mt-4">
                    <Button variant="ghost" size="sm" onClick={() => setStatus("idle")}>
                        Send another message
                    </Button>
                </div>
            </Card>
        );
    }

    return (
        <Card className={cn("relative overflow-hidden bg-card/50 backdrop-blur-sm", className)}>
            <CardHeader>
                <CardTitle className="text-2xl font-bold tracking-tight">
                    Drop me a message
                </CardTitle>
                <CardDescription>
                    Got a project idea, question, or just want to connect? Hit me up!
                </CardDescription>
            </CardHeader>

            <CardContent>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                name="name"
                                type="text"
                                required
                                placeholder="John Doe"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                required
                                placeholder="john@example.com"
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                            id="message"
                            name="message"
                            required
                            rows={4}
                            placeholder="Hey! I'd love to talk about..."
                            className="resize-none"
                        />
                    </div>

                    {status === "error" && (
                        <p className="text-xs font-medium text-destructive">
                            Something went wrong sending your message. Please try again!
                        </p>
                    )}

                    <Button
                        type="submit"
                        disabled={status === "loading"}
                        className="w-full sm:w-auto self-start"
                    >
                        {status === "loading" ? "Sending..." : "Send Message"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}