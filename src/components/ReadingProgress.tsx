"use client";

import { useEffect, useState } from "react";

export function ReadingProgress() {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        let rafId = 0;

        const update = () => {
            const doc = document.documentElement;
            const scrollable = doc.scrollHeight - doc.clientHeight;
            setProgress(scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0);
        };

        const onScroll = () => {
            cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(update);
        };

        update();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        return () => {
            cancelAnimationFrame(rafId);
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
        };
    }, []);

    return (
        <div
            aria-hidden="true"
            className="fixed inset-x-0 top-0 z-50 h-0.5 bg-transparent"
        >
            <div
                className="h-full origin-left bg-primary transition-transform duration-150 ease-out motion-reduce:transition-none"
                style={{ transform: `scaleX(${progress})` }}
            />
        </div>
    );
}
