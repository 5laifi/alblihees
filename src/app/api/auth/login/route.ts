import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase";
import bcrypt from "bcryptjs";

// Simple in-memory rate limiter (per-instance, resets on cold start)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 1000; // 1 minute

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const record = loginAttempts.get(ip);

    if (!record || now - record.lastAttempt > WINDOW_MS) {
        loginAttempts.set(ip, { count: 1, lastAttempt: now });
        return false;
    }

    record.count++;
    record.lastAttempt = now;

    if (record.count > MAX_ATTEMPTS) {
        return true;
    }

    return false;
}

export async function POST(request: Request) {
    try {
        // Rate limiting
        const forwarded = request.headers.get("x-forwarded-for");
        const ip = forwarded?.split(",")[0]?.trim() || "unknown";

        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: "Too many login attempts. Please wait a minute." },
                { status: 429 }
            );
        }

        const body = await request.json();
        const { password } = body;

        if (!password || typeof password !== "string") {
            return NextResponse.json({ error: "Password is required" }, { status: 400 });
        }

        const supabase = createServerSupabaseClient();

        // Get the password hash from the database
        const { data: settingsData } = await supabase
            .from("site_settings")
            .select("value")
            .eq("key", "admin_password_hash")
            .single();

        let isValid = false;

        if (settingsData && settingsData.value) {
            // Always use bcrypt comparison
            isValid = await bcrypt.compare(password, settingsData.value);
        } else {
            // First-time setup: hash the ENV password, store it, and verify
            const envPassword = process.env.ADMIN_PASSWORD;
            if (!envPassword) {
                console.error("ADMIN_PASSWORD environment variable is not set");
                return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
            }

            // Hash and store the ENV password for future use
            const salt = await bcrypt.genSalt(12);
            const hash = await bcrypt.hash(envPassword, salt);

            await supabase
                .from("site_settings")
                .insert({ key: "admin_password_hash", value: hash, type: "text" });

            // Now verify against the hash
            isValid = await bcrypt.compare(password, hash);
        }

        if (!isValid) {
            return NextResponse.json({ error: "Invalid password" }, { status: 401 });
        }

        // Create a session token
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

        // Set cookie with proper maxAge
        response.cookies.set("admin_session", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 60 * 60 * 24, // 24 hours — matches JWT expiry
        });

        return response;

    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
