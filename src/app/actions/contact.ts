"use server";

import { Resend } from "resend";

const getResend = () => new Resend(process.env.RESEND_API_KEY);

export async function sendContactEmail(formData: FormData) {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const message = formData.get("message") as string;

    if (!name || !email || !message) {
        return { error: "Missing fields" };
    }

    try {
        await getResend().emails.send({
            from: "Contact Form <contact@oud-idk.dev>",
            to: ["dayton@oud-idk.dev"],
            replyTo: email,
            subject: `New message from ${name} on oud-idk.dev`,
            text: `From: ${name} (${email})\n\nMessage:\n${message}`,
        });

        return { success: true };
    } catch (err) {
        return { error: "Failed to send email" };
    }
}