import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { getAdminSecret, setAdminSecret } from "@/lib/admin-secrets";
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

        const supabase = createAdminSupabaseClient();

        // Get the password hash from the database. This throws on a database error,
        // so a failed read can never be mistaken for "no password set yet".
        const storedHash = await getAdminSecret(supabase, "admin_password_hash");

        let isValid = false;

        if (storedHash) {
            // Always use bcrypt comparison
            isValid = await bcrypt.compare(password, storedHash);
        } else {
            // First-time setup: hash the ENV password, store it, and verify
            const envPassword = process.env.ADMIN_PASSWORD;
            if (!envPassword) {
                console.error("ADMIN_PASSWORD environment variable is not set");
                return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
            }

            // Verify against a fresh hash of the ENV password (constant-time via bcrypt)
            const salt = await bcrypt.genSalt(12);
            const hash = await bcrypt.hash(envPassword, salt);
            isValid = await bcrypt.compare(password, hash);

            // Store the hash only after a SUCCESSFUL login, never on a failed attempt:
            // a hash in admin_secrets must mean "an admin logged in through this code".
            // Throws if it cannot be stored, so the ENV password is only ever accepted
            // when first-time setup actually completes.
            if (isValid) {
                await setAdminSecret(supabase, "admin_password_hash", hash);
            }
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
        console.error("Login error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
