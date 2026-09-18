import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { getAdminSecret, setAdminSecret, deleteAdminSecrets } from "@/lib/admin-secrets";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Constant-time comparison so the token cannot be guessed byte by byte from response timing
function tokensMatch(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { token, newPassword } = body;

        if (!token || !newPassword || typeof token !== "string" || typeof newPassword !== "string") {
            return NextResponse.json({ error: "Token and new password are required" }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
        }

        const supabase = createAdminSupabaseClient();

        // 1. Check if token exists and is valid
        const storedToken = await getAdminSecret(supabase, "password_reset_token");
        const expiresAt = await getAdminSecret(supabase, "password_reset_expires");

        if (!storedToken || !tokensMatch(storedToken, token)) {
            return NextResponse.json({ error: "Invalid or missing reset token" }, { status: 400 });
        }

        if (!expiresAt || new Date(expiresAt) < new Date()) {
            return NextResponse.json({ error: "Reset link has expired. Please request a new one." }, { status: 400 });
        }

        // 2. Hash new password and save it
        const salt = await bcrypt.genSalt(12);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);

        await setAdminSecret(supabase, "admin_password_hash", newPasswordHash);

        // 3. Clear the reset token so it can't be reused
        await deleteAdminSecrets(supabase, ["password_reset_token", "password_reset_expires"]);

        return NextResponse.json({ success: true, message: "Password has been successfully reset" });
    } catch (e) {
        console.error("Reset password error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
