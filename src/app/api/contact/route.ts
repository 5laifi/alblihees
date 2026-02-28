import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const NOTIFY_EMAIL = "thari@ouraevents.com";

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
        const supabase = createServerSupabaseClient();
        const body = await request.json();

        const { name, email, phone, message } = body;

        if (!name || !email || !message) {
            return NextResponse.json(
                { error: "Name, email, and message are required" },
                { status: 400 }
            );
        }

        // Save to database
        const { data, error } = await supabase
            .from("contact_submissions")
            .insert({ name, email, phone: phone || "", message })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Send email notification
        if (resend) {
            try {
                const safeName = escapeHtml(name);
                const safeEmail = escapeHtml(email);
                const safePhone = phone ? escapeHtml(phone) : "";
                const safeMessage = escapeHtml(message);

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
