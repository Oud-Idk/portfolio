"use server";

import { headers } from "next/headers";
import { Resend } from "resend";

import {
    createUnsubscribeToken,
    REQUEST_TOKEN_TTL_SECONDS,
    WELCOME_TOKEN_TTL_SECONDS,
} from "@/lib/unsubscribe-token";

const getResend = () => new Resend(process.env.RESEND_API_KEY);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? "https://oud-idk.dev";

/**
 * Best-effort in-memory throttle. A single instance, so it resets on deploy and
 * doesn't hold across replicas — enough to stop casual hammering, not a real
 * rate limiter. Swap for a shared store before leaning on it.
 */
const REQUEST_COOLDOWN_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 5;
const recentRequests = new Map<string, number[]>();

async function throttleKey(): Promise<string> {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
    return forwarded || h.get("x-real-ip") || "unknown";
}

async function allowRequest(): Promise<boolean> {
    const key = await throttleKey();
    const now = Date.now();
    const windowStart = now - REQUEST_COOLDOWN_MS;
    const recent = (recentRequests.get(key) ?? []).filter((t) => t > windowStart);

    if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
        recentRequests.set(key, recent);
        return false;
    }

    recent.push(now);
    recentRequests.set(key, recent);
    if (recentRequests.size > 10_000) recentRequests.clear();
    return true;
}

export async function subscribeToNewsletter(formData: FormData) {
    const email = (formData.get("email") as string | null)?.trim().toLowerCase();

    if (!email || !EMAIL_RE.test(email)) {
        return { error: "Please enter a valid email address." };
    }

    const segmentId = process.env.RESEND_SEGMENT_ID;
    if (!segmentId) {
        return { error: "Newsletter is not configured yet." };
    }

    try {
        const { data, error } = await getResend().contacts.create({
            email,
            segments: [{ id: segmentId }],
        });

        if (error) {
            // Treat duplicate signups as success. Don't leak whether it's already subscribed.
            if (error.message?.toLowerCase().includes("already exists")) {
                return { success: true };
            }
            return { error: "Could not subscribe right now. Please try again." };
        }

        try {
            // Signed + expiring, never the raw contact id: the id alone is a
            // bearer token, and it leaks through forwards and screenshots.
            const unsubscribeUrl = data?.id
                ? `${siteUrl()}/api/unsubscribe?token=${encodeURIComponent(
                      createUnsubscribeToken(
                          { kind: "contact", id: data.id },
                          WELCOME_TOKEN_TTL_SECONDS,
                      ),
                  )}`
                : `${siteUrl()}/unsubscribe`;

            await getResend().emails.send({
                from: "Blog <blog@oud-idk.dev>",
                to: [email],
                subject: "Welcome to the mailing list!",
                text: `Thanks for subscribing to oud-idk.dev!\n\nYou'll get an email whenever I publish a new post. No random spam, just new writing, and you can unsubscribe at any time:\n${unsubscribeUrl}\n\nSee you soon,\nOud`,
                html: `
<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 640px; margin: 0 auto; padding: 32px 24px; background: #111111; color: #f2f2f2; border-radius: 12px; border: 1px solid #292929;">
  <img src="${siteUrl}/chonky-boi.png" alt="Chonky boi" width="96" height="96" style="border-radius: 12px; margin: 0 0 16px; display: block;" />
  <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 16px; letter-spacing: -0.5px;">You're on the list!</h1>
  
  <p style="color: #bebebe; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
    Thanks for subscribing to <a href="https://oud-idk.dev" style="color: #f2f2f2; font-weight: 600; text-decoration: underline;">oud-idk.dev</a>.
    You'll get an email whenever I publish a new post. No random spam, just new writing.
  </p>
  
  <p style="color: #bebebe; font-size: 15px; line-height: 1.6; margin: 0 0 28px;">
    See you soon,<br><strong style="color: #f2f2f2;">Oud</strong>
  </p>

  <hr style="border: none; border-top: 1px solid #242424;">

  <div style="text-align: center; padding: 12px 0 4px;">
    <p style="font-size: 13px; color: #bebebe; margin: 0 0 14px;">
      Having second thoughts?
    </p>

    <a href="${unsubscribeUrl}" 
       style="display: block; 
              background: #141414; 
              color: #ff4742; 
              border: 1px solid #292929; 
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
                headers: data?.id
                    ? {
                          "List-Unsubscribe": `<${unsubscribeUrl}>`,
                          // RFC 8058: providers must issue one-click as POST,
                          // which is the only handler that mutates.
                          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                      }
                    : undefined,
            });
        } catch {
            console.error("Failed to send welcome email");
        }

        return { success: true };
    } catch {
        return { error: "Could not subscribe right now. Please try again." };
    }
}

/**
 * Self-serve unsubscribe for people who reach the /unsubscribe page instead of
 * a link in an email — broadcasts carry no per-recipient token, so the request
 * has to be confirmed by mailing a signed link to the address. That's what
 * makes it proof of mailbox ownership rather than proof of knowledge: asking to
 * be removed from someone else's list no longer works.
 */
export async function requestUnsubscribe(formData: FormData) {
    const email = (formData.get("email") as string | null)?.trim().toLowerCase();

    if (!email || !EMAIL_RE.test(email)) {
        return { error: "Please enter a valid email address." };
    }

    if (!(await allowRequest())) {
        return { error: "Too many requests. Please try again in a minute." };
    }

    const site = siteUrl();
    const token = createUnsubscribeToken(
        { kind: "email", email },
        REQUEST_TOKEN_TTL_SECONDS,
    );
    const unsubscribeUrl = `${site}/api/unsubscribe?token=${encodeURIComponent(token)}`;

    try {
        await getResend().emails.send({
            from: "Blog <blog@oud-idk.dev>",
            to: [email],
            subject: "Confirm your unsubscribe",
            text: `Someone asked to stop emails from oud-idk.dev at this address. If that was you, confirm here:\n${unsubscribeUrl}\n\nThis link expires in one hour. If it wasn't you, ignore this email — nothing will change and the link does nothing.`,
            html: `
<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 640px; margin: 0 auto; padding: 32px 24px; background: #111111; color: #f2f2f2; border-radius: 12px; border: 1px solid #292929;">
  <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 16px; letter-spacing: -0.5px;">Confirm unsubscribe</h1>

  <p style="color: #bebebe; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
    Someone asked to stop emails from <a href="${site}" style="color: #f2f2f2; font-weight: 600; text-decoration: underline;">oud-idk.dev</a> for this address.
    Nothing changes until you confirm.
  </p>

  <p style="color: #bebebe; font-size: 15px; line-height: 1.6; margin: 0 0 28px;">
    If that wasn&apos;t you, ignore this email. The link below does nothing on its own.
  </p>

  <div style="text-align: center;">
    <a href="${unsubscribeUrl}"
       style="display: block;
              background: #141414;
              color: #ff4742;
              border: 1px solid #292929;
              border-radius: 8px;
              padding: 14px 24px;
              font-size: 14px;
              font-weight: 700;
              text-decoration: none;
              text-align: center;">
      CONFIRM UNSUBSCRIBE
    </a>
    <p style="font-size: 12px; color: #8b8b8b; margin: 12px 0 0;">This link expires in one hour.</p>
  </div>
</div>`,
        });
    } catch {
        // Deliberately still report success: whether the send failed is not
        // something to leak back to whoever submitted the address.
    }

    // Same answer whether or not the address was ever subscribed.
    return { success: true };
}
