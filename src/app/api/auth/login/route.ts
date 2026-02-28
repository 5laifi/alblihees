import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { password } = body;

        const supabase = createServerSupabaseClient();

        // 1. Check if a custom password hash is set in the database
        const { data: settingsData } = await supabase
            .from("site_settings")
            .select("value")
            .eq("key", "admin_password_hash")
            .single();

        let isValid = false;

        if (settingsData && settingsData.value) {
            // Compare against database hash
            isValid = await bcrypt.compare(password, settingsData.value);
        } else {
            // Fallback to ENV variable if no custom password is set
            const envPassword = process.env.ADMIN_PASSWORD;
            if (!envPassword) {
                console.error("ADMIN_PASSWORD environment variable is not set");
                return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
            }
            isValid = password === envPassword;
        }

        if (!isValid) {
            return NextResponse.json({ error: "Invalid password" }, { status: 401 });
        }

        // Create a simple session token
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error("JWT_SECRET environment variable is not set");
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }
        const secret = new TextEncoder().encode(jwtSecret);

        const token = await new SignJWT({ role: "admin" })
            .setProtectedHeader({ alg: "HS256" })
            .setExpirationTime("24h")
            .sign(secret);

        const response = NextResponse.json({ success: true });

        // Set cookie
        response.cookies.set("admin_session", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
        });

        return response;

    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
