import type { ReactNode } from "react";

/**
 * Re-mounts on every navigation (unlike layout.tsx), so this gives a subtle
 * fade/slide transition between pages. Pure CSS — no client JS shipped.
 */
export default function Template({ children }: { children: ReactNode }) {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out motion-reduce:animate-none">
            {children}
        </div>
    );
}
