import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { token, newPassword } = body;

        if (!token || !newPassword) {
            return NextResponse.json({ error: "Token and new password are required" }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
        }

        const supabase = createServerSupabaseClient();

        // 1. Check if token exists and is valid
        const { data: storedTokenData } = await supabase
            .from("site_settings")
            .select("value")
            .eq("key", "password_reset_token")
            .single();

        const { data: expiryData } = await supabase
            .from("site_settings")
            .select("value")
            .eq("key", "password_reset_expires")
            .single();

        if (!storedTokenData || !storedTokenData.value || storedTokenData.value !== token) {
            return NextResponse.json({ error: "Invalid or missing reset token" }, { status: 400 });
        }

        if (!expiryData || !expiryData.value || new Date(expiryData.value) < new Date()) {
            return NextResponse.json({ error: "Reset link has expired. Please request a new one." }, { status: 400 });
        }

        // 2. Hash new password and save it
        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);

        // Upsert new password
        await saveOrUpdateSetting(supabase, "admin_password_hash", newPasswordHash);

        // 3. Clear the reset token so it can't be reused
        await supabase.from("site_settings").delete().in("key", ["password_reset_token", "password_reset_expires"]);

        return NextResponse.json({ success: true, message: "Password has been successfully reset" });
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
