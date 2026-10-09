import { NextRequest } from "next/server";
import { Resend } from "resend";

import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token";

const getResend = () => new Resend(process.env.RESEND_API_KEY);

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function page(title: string, message: string, extra?: string) {
    return new Response(
        `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
  <body style="font-family: system-ui, sans-serif; display:flex; min-height:100vh; align-items:center; justify-content:center; background:#0a0a0a; color:#fafafa; margin:0;">
    <main style="max-width:32rem; padding:2rem; text-align:center;">
      <h1 style="font-size:1.5rem;">${escapeHtml(title)}</h1>
      <p style="color:#a1a1aa;">${escapeHtml(message)}</p>
      ${extra ?? ""}
      <p style="margin-top:2rem;"><a href="/" style="color:#fafafa;">← Back to oud-idk.dev</a></p>
    </main>
  </body>
</html>`,
        {
            headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": "no-store",
            },
        },
    );
}

/** Confirmation form. POSTs the token in the body so it never lands in a URL. */
function confirmForm(token: string): string {
    return `<form method="post" action="/api/unsubscribe" style="margin-top:2rem;">
      <input type="hidden" name="token" value="${escapeHtml(token)}" />
      <button type="submit" style="cursor:pointer; background:#141414; color:#ff4742; border:1px solid #292929; border-radius:8px; padding:12px 24px; font-size:14px; font-weight:700;">
        Confirm unsubscribe
      </button>
    </form>`;
}

const INVALID =
    "This unsubscribe link is invalid or has expired. You can request a fresh one from the unsubscribe page.";
const FAILED = "Something went wrong. Please try again later.";

/**
 * Read-only. Renders the confirmation step and nothing else — no mutation, so
 * a link scanner (mail clients, Safe Browsing, chat unfurlers) can't unsubscribe
 * somebody by merely fetching the URL.
 */
export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
        return page(
            "Invalid link",
            "This unsubscribe link is missing its token.",
        );
    }

    if (!verifyUnsubscribeToken(token)) {
        return page("Link expired or invalid", INVALID);
    }

    return page(
        "Confirm unsubscribe",
        "Stop getting emails from oud-idk.dev? This only affects you.",
        confirmForm(token),
    );
}

/**
 * The only handler that changes anything. Also serves RFC 8058 one-click
 * unsubscribe, which providers must issue as POST.
 */
export async function POST(request: NextRequest) {
    let token: unknown;

    try {
        const form = await request.formData();
        token = form.get("token");
    } catch {
        return page("Invalid request", "This request was missing its unsubscribe token.");
    }

    if (typeof token !== "string" || !token) {
        return page("Invalid request", "This request was missing its unsubscribe token.");
    }

    const target = verifyUnsubscribeToken(token);
    if (!target) {
        return page("Link expired or invalid", INVALID);
    }

    try {
        const { error } = await getResend().contacts.update(
            target.kind === "contact"
                ? { id: target.id, unsubscribed: true }
                : { email: target.email, unsubscribed: true },
        );

        if (error) {
            return page("Unsubscribe failed", FAILED);
        }

        return page("You've been unsubscribed", "You won't receive any more emails from oud-idk.dev.");
    } catch {
        return page("Unsubscribe failed", FAILED);
    }
}