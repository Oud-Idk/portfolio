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
            <span aria-hidden="true" className="invisible motion-reduce:visible">
                &quot;{QUOTE}&quot;
            </span>
            <span aria-hidden="true" className="absolute inset-0 motion-reduce:hidden animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards duration-500 delay-200">
                &quot;{text}
                <span className="animate-[blink_1s_step-end_infinite] text-foreground -mx-0.75">
                    |
                </span>
                &quot;
            </span>
        </p>
    );
}
