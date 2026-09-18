import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { getAdminSecret, setAdminSecret } from "@/lib/admin-secrets";
import bcrypt from "bcryptjs";

export async function PUT(request: Request) {
    if (!(await verifyAdmin())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword || typeof currentPassword !== "string" || typeof newPassword !== "string") {
            return NextResponse.json({ error: "Current and new password are required" }, { status: 400 });
        }

        if (newPassword.length < 8) {
            return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
        }

        const supabase = createAdminSupabaseClient();

        // Get current password hash from database
        const storedHash = await getAdminSecret(supabase, "admin_password_hash");

        if (!storedHash) {
            return NextResponse.json({ error: "No password set. Please log in first to initialize." }, { status: 400 });
        }

        // Always use bcrypt comparison — no plaintext fallback
        const isValid = await bcrypt.compare(currentPassword, storedHash);

        if (!isValid) {
            return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
        }

        // Hash new password and save it
        const salt = await bcrypt.genSalt(12);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);

        await setAdminSecret(supabase, "admin_password_hash", newPasswordHash);

        return NextResponse.json({ success: true, message: "Password updated successfully" });
    } catch (e) {
        console.error("Password change error:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
