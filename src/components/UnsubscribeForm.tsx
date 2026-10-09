"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestUnsubscribe } from "@/app/actions/newsletter";

export function UnsubscribeForm() {
    const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        setStatus("loading");
        setErrorMessage(null);

        const formData = new FormData(e.currentTarget);
        const result = await requestUnsubscribe(formData);

        if ("error" in result && result.error) {
            setErrorMessage(result.error);
            setStatus("error");
        } else {
            setStatus("sent");
        }
    }

    if (status === "sent") {
        return (
            <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Check your inbox</p>
                <p className="text-muted-foreground text-sm">
                    If that address is on the list, we&apos;ve sent it a link to
                    confirm. The link expires in an hour, and nothing changes until it&apos;s
                    clicked.
                </p>
                <Button
                    variant="ghost"
                    size="sm"
                    className="self-start"
                    onClick={() => setStatus("idle")}
                >
                    Try another address
                </Button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-2">
                <Label htmlFor="unsubscribe-email">Email</Label>
                <Input
                    id="unsubscribe-email"
                    name="email"
                    type="email"
                    required
                    placeholder="john@example.com"
                    disabled={status === "loading"}
                />
            </div>

            {status === "error" && errorMessage && (
                <p className="text-destructive text-xs font-medium">{errorMessage}</p>
            )}

            <Button type="submit" disabled={status === "loading"} className="self-start">
                {status === "loading" ? "Sending..." : "Unsubscribe me"}
            </Button>

            <p className="text-muted-foreground text-xs">
                We&apos;ll email a confirmation link to that address. This is what stops
                anyone else from removing you from the list.
            </p>
        </form>
    );
}