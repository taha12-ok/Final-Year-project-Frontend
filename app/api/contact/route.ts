import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

// Where contact form notifications are delivered
const DESTINATION_EMAIL = "tahashabbir321@gmail.com";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const { name, email, message } = await req.json().catch(() => ({}));

    // ── Server-side validation (mirrors the client-side checks) ──
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json(
        { success: false, error: "Please fill in all fields." },
        { status: 400 }
      );
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // ── Credentials come ONLY from environment variables ──
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    if (!user || !pass) {
      console.error("Contact email not configured: GMAIL_USER / GMAIL_APP_PASSWORD missing from environment.");
      return NextResponse.json(
        { success: false, error: "Email service is not configured right now. Please try again later." },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: user,
      to: DESTINATION_EMAIL,
      replyTo: email,
      subject: `MedAI Contact: ${name}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Message:</b> ${message}</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Log details server-side only — never expose them to the user
    console.error("Contact form error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong while sending your message. Please try again." },
      { status: 500 }
    );
  }
}
