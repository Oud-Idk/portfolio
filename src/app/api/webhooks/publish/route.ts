import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

import { verifySanityWebhook } from "@/lib/sanity-webhook";

const getResend = () => new Resend(process.env.RESEND_API_KEY);

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/**
 * Sanity webhook receiver: sends a new-post broadcast to the mailing list.
 * Configure a second webhook in the Sanity dashboard with:
 *   URL:        https://<site>/api/webhooks/publish
 *   Secret:     $SANITY_WEBHOOK_SECRET
 *   Trigger on: Create
 *   Filter:     _type == "post" && defined(publishedAt) && !(_id in path("drafts.**"))
 *   Projection: { title, excerpt, "slug": slug.current, publishedAt }
 */
export async function POST(request: NextRequest) {
    const rawBody = await request.text();
    const valid = verifySanityWebhook(
        request.headers.get("sanity-webhook-signature"),
        request.nextUrl.searchParams.get("secret"),
        rawBody,
    );
    if (!valid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { title?: string; excerpt?: string; slug?: string };
    try {
        body = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!body.title || !body.slug) {
        return NextResponse.json({ error: "Missing title or slug" }, { status: 400 });
    }

    const segmentId = process.env.RESEND_SEGMENT_ID;
    if (!segmentId) {
        return NextResponse.json({ error: "Newsletter is not configured yet." }, { status: 500 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://oud-idk.dev";
    const postUrl = `${siteUrl}/blog/${body.slug}`;

    try {
        const { error } = await getResend().broadcasts.create({
            name: `New post: ${body.title}`,
            subject: body.title,
            segmentId,
            from: "Blog <blog@oud-idk.dev>",
            previewText: body.excerpt,
            send: true,
            text: `${body.title}\n\n${body.excerpt ?? ""}\n\nRead it here: ${postUrl}`,
            html: `
<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 640px; margin: 0 auto; padding: 32px 24px; background: oklch(0.176 0 0); color: oklch(0.96 0 0); border-radius: 12px; border: 1px solid oklch(0.28 0 0);">
  <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: oklch(0.8 0 0); margin: 0 0 8px;">New post</p>
  <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 16px; letter-spacing: -0.5px;">${escapeHtml(body.title)}</h1>
  ${body.excerpt ? `<p style="color: oklch(0.8 0 0); font-size: 15px; line-height: 1.6; margin: 0 0 28px;">${escapeHtml(body.excerpt)}</p>` : ""}
  <a href="${postUrl}" style="display: block; background: oklch(0.193 0 0); color: oklch(0.96 0 0); border: 1px solid oklch(0.28 0 0); border-radius: 8px; padding: 14px 24px; font-size: 14px; font-weight: 700; text-decoration: none; text-align: center;">Read it →</a>

  <hr style="border: none; border-top: 1px solid oklch(0.26 0 0); margin: 28px 0 0;">

  <div style="text-align: center; padding: 12px 0 4px;">
    <p style="font-size: 13px; color: oklch(0.8 0 0); margin: 0 0 14px;">
      Having second thoughts?
    </p>

    <a href="${siteUrl}/unsubscribe"
       style="display: block;
              background: oklch(0.193 0 0);
              color: oklch(0.7 0.24 27);
              border: 1px solid oklch(0.28 0 0);
              border-radius: 8px;
              padding: 14px 24px;
              font-size: 14px;
              font-weight: 700;
              text-decoration: none;
              text-align: center;">
      UNSUBSCRIBE
    </a>
  </div>
</div>`,
        });

        if (error) {
            console.error("Broadcast failed:", error);
            return NextResponse.json({ error: "Broadcast failed" }, { status: 500 });
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Broadcast failed:", error);
        return NextResponse.json({ error: "Broadcast failed" }, { status: 500 });
    }
}
