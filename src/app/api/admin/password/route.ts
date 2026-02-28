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

        const supabase = createServerSupabaseClient();

        // 1. Check current password validity
        const { data: settingsData } = await supabase
            .from("site_settings")
            .select("value")
            .eq("key", "admin_password_hash")
            .single();

        let isValid = false;

        if (settingsData && settingsData.value) {
            // Compare against database hash
            isValid = await bcrypt.compare(currentPassword, settingsData.value);
        } else {
            // Fallback to ENV variable if no custom password is set
            const envPassword = process.env.ADMIN_PASSWORD;
            if (!envPassword) {
                return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
            }
            isValid = currentPassword === envPassword;
        }

        if (!isValid) {
            return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
        }

        // 2. Hash new password and save it
        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);

        // Check if key exists to update or insert
        const { data: existingKey } = await supabase
            .from("site_settings")
            .select("id")
            .eq("key", "admin_password_hash")
            .single();

        let error;
        if (existingKey) {
            const { error: updateError } = await supabase
                .from("site_settings")
                .update({ value: newPasswordHash })
                .eq("key", "admin_password_hash");
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from("site_settings")
                .insert({ key: "admin_password_hash", value: newPasswordHash, type: "text" });
            error = insertError;
        }

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "Password updated successfully" });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
    }
}
