"use client";

import { useEffect, useState } from "react";

const QUOTE =
    "If your website is not accessible, easy to use, and simple to look at... what's the point?";

export function TypingQuote() {
    const [text, setText] = useState("");

    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            setText(QUOTE);
            return;
        }

        let i = 0;
        const id = setInterval(() => {
            i += 1;
            setText(QUOTE.slice(0, i));
            if (i >= QUOTE.length) clearInterval(id);
        }, 30);

        return () => clearInterval(id);
    }, []);

    return (
        <p className="text-lg leading-relaxed text-muted-foreground">
            &quot;{text}
            <span
                aria-hidden="true"
                className="animate-[blink_1s_step-end_infinite] text-foreground"
            >
                |
            </span>
            &quot;
        </p>
    );
}
