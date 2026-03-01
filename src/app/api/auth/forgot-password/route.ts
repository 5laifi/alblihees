import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { Resend } from "resend";
import crypto from "crypto";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "thari@ouraevents.com";

// Rate limiter for forgot-password
const resetAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 3;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const record = resetAttempts.get(ip);

    if (!record || now - record.lastAttempt > WINDOW_MS) {
        resetAttempts.set(ip, { count: 1, lastAttempt: now });
        return false;
    }

    record.count++;
    record.lastAttempt = now;
    return record.count > MAX_ATTEMPTS;
}

export async function POST(request: Request) {
    try {
        // Rate limiting
        const forwarded = request.headers.get("x-forwarded-for");
        const ip = forwarded?.split(",")[0]?.trim() || "unknown";

        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: "Too many reset attempts. Please wait 15 minutes." },
                { status: 429 }
            );
        }

        const body = await request.json();
        const { email } = body;

        // Don't reveal if email exists or not
        if (!email || email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
            return NextResponse.json({ success: true, message: "If the email matches the admin account, a reset link was sent." });
        }

        if (!resend) {
            return NextResponse.json({ error: "Email service not configured. Please contact server administrator." }, { status: 500 });
        }

        const supabase = createServerSupabaseClient();

        // Generate a random token
        const resetToken = crypto.randomBytes(32).toString("hex");
        // Token expires in 15 minutes
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        // Save token and expiry to site_settings
        await saveOrUpdateSetting(supabase, "password_reset_token", resetToken);
        await saveOrUpdateSetting(supabase, "password_reset_expires", expiresAt);

        // Use SITE_URL env var instead of trusting the Host header
        const siteUrl = process.env.SITE_URL || "https://tharialblaihees.com";
        const resetUrl = `${siteUrl}/en/admin/reset-password?token=${resetToken}`;

        // Send email
        await resend.emails.send({
            from: "Dhari Admin <onboarding@resend.dev>",
            to: ADMIN_EMAIL,
            subject: "Admin Password Reset Request",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Password Reset Request</h2>
                    <p>Someone requested a password reset for your admin dashboard.</p>
                    <p>If this was you, click the button below to set a new password. This link expires in 15 minutes.</p>
                    <div style="margin: 30px 0;">
                        <a href="${resetUrl}" style="background-color: #021526; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
                    </div>
                    <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
                </div>
            `,
        });

        return NextResponse.json({ success: true, message: "If the email matches the admin account, a reset link was sent." });
    } catch (e: any) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// Helper to upsert settings securely
async function saveOrUpdateSetting(supabase: any, key: string, value: string) {
    const { data: existing } = await supabase.from("site_settings").select("id").eq("key", key).single();
    if (existing) {
        await supabase.from("site_settings").update({ value }).eq("key", key);
    } else {
        await supabase.from("site_settings").insert({ key, value, type: "text" });
    }
}
