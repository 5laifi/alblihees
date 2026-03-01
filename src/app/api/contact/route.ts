import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const NOTIFY_EMAIL = process.env.ADMIN_EMAIL || "thari@ouraevents.com";

// Simple in-memory rate limiter
const contactAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 3; // 3 submissions per window
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const record = contactAttempts.get(ip);

    if (!record || now - record.lastAttempt > WINDOW_MS) {
        contactAttempts.set(ip, { count: 1, lastAttempt: now });
        return false;
    }

    record.count++;
    record.lastAttempt = now;
    return record.count > MAX_ATTEMPTS;
}

// Email format validation
function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Sanitize user input before embedding in HTML email
function escapeHtml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Public endpoint — no auth needed
export async function POST(request: Request) {
    try {
        // Rate limiting
        const forwarded = request.headers.get("x-forwarded-for");
        const ip = forwarded?.split(",")[0]?.trim() || "unknown";

        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: "Too many submissions. Please wait a few minutes." },
                { status: 429 }
            );
        }

        const supabase = createServerSupabaseClient();
        const body = await request.json();

        const { name, email, phone, message } = body;

        // Required field validation
        if (!name || !email || !message) {
            return NextResponse.json(
                { error: "Name, email, and message are required" },
                { status: 400 }
            );
        }

        // Input length validation
        if (typeof name !== "string" || name.length > 100) {
            return NextResponse.json({ error: "Name must be under 100 characters" }, { status: 400 });
        }
        if (typeof email !== "string" || email.length > 254) {
            return NextResponse.json({ error: "Email must be under 254 characters" }, { status: 400 });
        }
        if (phone && (typeof phone !== "string" || phone.length > 20)) {
            return NextResponse.json({ error: "Phone must be under 20 characters" }, { status: 400 });
        }
        if (typeof message !== "string" || message.length > 5000) {
            return NextResponse.json({ error: "Message must be under 5000 characters" }, { status: 400 });
        }

        // Email format validation
        if (!isValidEmail(email)) {
            return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
        }

        // Save to database
        const { data, error } = await supabase
            .from("contact_submissions")
            .insert({ name: name.trim(), email: email.trim(), phone: (phone || "").trim(), message: message.trim() })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Send email notification
        if (resend) {
            try {
                const safeName = escapeHtml(name.trim());
                const safeEmail = escapeHtml(email.trim());
                const safePhone = phone ? escapeHtml(phone.trim()) : "";
                const safeMessage = escapeHtml(message.trim());

                await resend.emails.send({
                    from: "Dhari Website <onboarding@resend.dev>",
                    to: NOTIFY_EMAIL,
                    subject: `New Contact: ${safeName}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #021526;">New Contact Message</h2>
                            <hr style="border: 1px solid #eee;" />
                            <p><strong>Name:</strong> ${safeName}</p>
                            <p><strong>Email:</strong> ${safeEmail}</p>
                            ${safePhone ? `<p><strong>Phone:</strong> ${safePhone}</p>` : ""}
                            <p><strong>Message:</strong></p>
                            <div style="background: #f9f9f9; padding: 16px; border-radius: 8px;">
                                ${safeMessage.replace(/\n/g, "<br>")}
                            </div>
                            <hr style="border: 1px solid #eee; margin-top: 24px;" />
                            <p style="color: #888; font-size: 12px;">Sent from your portfolio website contact form</p>
                        </div>
                    `,
                });
            } catch (emailError) {
                console.error("Email send error:", emailError);
                // Don't fail the request if email fails — data is saved
            }
        }

        return NextResponse.json({ success: true, id: data.id }, { status: 201 });
    } catch {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
