import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function PUT(request: Request) {
    if (!(await verifyAdmin())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: "Current and new password are required" }, { status: 400 });
        }

        if (newPassword.length < 8) {
            return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
        }

        const supabase = createServerSupabaseClient();

        // Get current password hash from database
        const { data: settingsData } = await supabase
            .from("site_settings")
            .select("value")
            .eq("key", "admin_password_hash")
            .single();

        if (!settingsData || !settingsData.value) {
            return NextResponse.json({ error: "No password set. Please log in first to initialize." }, { status: 400 });
        }

        // Always use bcrypt comparison — no plaintext fallback
        const isValid = await bcrypt.compare(currentPassword, settingsData.value);

        if (!isValid) {
            return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
        }

        // Hash new password and save it
        const salt = await bcrypt.genSalt(12);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);

        const { error } = await supabase
            .from("site_settings")
            .update({ value: newPasswordHash })
            .eq("key", "admin_password_hash");

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "Password updated successfully" });
    } catch (e: any) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
