import { NextRequest } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function page(title: string, message: string) {
    return new Response(
        `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>${title}</title></head>
  <body style="font-family: system-ui, sans-serif; display:flex; min-height:100vh; align-items:center; justify-content:center; background:#0a0a0a; color:#fafafa; margin:0;">
    <main style="max-width:32rem; padding:2rem; text-align:center;">
      <h1 style="font-size:1.5rem;">${title}</h1>
      <p style="color:#a1a1aa;">${message}</p>
      <a href="/" style="color:#fafafa;">← Back to oud-idk.dev</a>
    </main>
  </body>
</html>`,
        { headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
}

export async function GET(request: NextRequest) {
    const id = request.nextUrl.searchParams.get("id");
    const email = request.nextUrl.searchParams.get("email");

    if (!id && !email) {
        return page("Invalid link", "This unsubscribe link is missing its contact id or email.");
    }

    try {
        const { error } = id
            ? await resend.contacts.update({ id, unsubscribed: true })
            : await resend.contacts.update({ email: email as string, unsubscribed: true });

        if (error) {
            return page("Unsubscribe failed", "Something went wrong. Please try again later.");
        }

        return page("You've been unsubscribed", "You won't receive any more emails from oud-idk.dev.");
    } catch {
        return page("Unsubscribe failed", "Something went wrong. Please try again later.");
    }
}
