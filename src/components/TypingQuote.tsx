"use client";

import { useEffect, useState } from "react";

const QUOTE =
    "If your website is not accessible, easy to use, and simple to look at... what's the point?";

export function TypingQuote() {
    const [text, setText] = useState("");

    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            return;
        }

        let i = 0;
        let intervalId: ReturnType<typeof setInterval> | undefined;
        const timeoutId = setTimeout(() => {
            intervalId = setInterval(() => {
                i += 1;
                setText(QUOTE.slice(0, i));
                if (i >= QUOTE.length) clearInterval(intervalId);
            }, 40);
        }, 150);

        return () => {
            clearTimeout(timeoutId);
            if (intervalId !== undefined) clearInterval(intervalId);
        };
    }, []);

    return (
        <p className="relative text-lg leading-relaxed text-muted-foreground">
            <span className="sr-only">&quot;{QUOTE}&quot;</span>
            {/* Reserves the final layout space so typing doesn't trigger CLS */}
            <span aria-hidden="true" className="invisible motion-reduce:visible">
                &quot;{QUOTE}&quot;
            </span>
            {/* Motion allowed: typing effect overlays the reserved space */}
            <span aria-hidden="true" className="absolute inset-0 motion-reduce:hidden">
                &quot;{text}
                <span className="animate-[blink_1s_step-end_infinite] text-foreground -mx-0.75">
                    |
                </span>
                &quot;
            </span>
        </p>
    );
}
