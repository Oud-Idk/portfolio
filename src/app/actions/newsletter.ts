"use server";

import { Resend } from "resend";

const getResend = () => new Resend(process.env.RESEND_API_KEY);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://oud-idk.dev";
            const unsubscribeUrl = data?.id
                ? `${siteUrl}/api/unsubscribe?id=${data.id}`
                : `${siteUrl}/blog`;

            await getResend().emails.send({
                from: "Blog <blog@oud-idk.dev>",
                to: [email],
                subject: "Welcome to the mailing list!",
                text: `Thanks for subscribing to oud-idk.dev!\n\nYou'll get an email whenever I publish a new post. No random spam, just new writing, and you can unsubscribe at any time:\n${unsubscribeUrl}\n\nSee you soon,\nOud`,
                html: `
<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 640px; margin: 0 auto; padding: 32px 24px; background: oklch(0.176 0 0); color: oklch(0.96 0 0); border-radius: 12px; border: 1px solid oklch(0.28 0 0);">
  <img src="${siteUrl}/chonky-boi.png" alt="Chonky boi" width="96" height="96" style="border-radius: 12px; margin: 0 0 16px; display: block;" />
  <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 16px; letter-spacing: -0.5px;">You're on the list!</h1>
  
  <p style="color: oklch(0.8 0 0); font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
    Thanks for subscribing to <a href="https://oud-idk.dev" style="color: oklch(0.96 0 0); font-weight: 600; text-decoration: underline;">oud-idk.dev</a>.
    You'll get an email whenever I publish a new post. No random spam, just new writing.
  </p>
  
  <p style="color: oklch(0.8 0 0); font-size: 15px; line-height: 1.6; margin: 0 0 28px;">
    See you soon,<br><strong style="color: oklch(0.96 0 0);">Oud</strong>
  </p>

  <hr style="border: none; border-top: 1px solid oklch(0.26 0 0);">

  <div style="text-align: center; padding: 12px 0 4px;">
    <p style="font-size: 13px; color: oklch(0.8 0 0); margin: 0 0 14px;">
      Having second thoughts?
    </p>

    <a href="${unsubscribeUrl}" 
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
                headers: data?.id
                    ? { "List-Unsubscribe": `<${unsubscribeUrl}>` }
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
