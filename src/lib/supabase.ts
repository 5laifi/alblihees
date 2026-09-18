import { createClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Server-side client on the public (anon / publishable) key.
// RLS applies: use it for public page reads only (src/lib/data.ts, layout).
export function createServerSupabaseClient() {
    return createClient(supabaseUrl, supabaseAnonKey);
}

let warnedMissingServiceKey = false;

// Privileged server-side client (service_role / secret key). Bypasses RLS.
// Only call this from API routes, and only after verifyAdmin() for admin
// routes. The key has no NEXT_PUBLIC_ prefix, so it is never sent to the browser.
export function createAdminSupabaseClient() {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
        if (process.env.NODE_ENV === "production") {
            const message =
                "[supabase] SUPABASE_SERVICE_ROLE_KEY is not set. Admin, auth and contact API routes " +
                "cannot reach the database without it. Add it to the Vercel project environment " +
                "variables (Production) and redeploy.";
            console.error(message);
            throw new Error(message);
        }

        // Local development only: fall back to the anon key so the app still boots.
        // Once the RLS lockdown migration has run, admin writes will be rejected by RLS.
        if (!warnedMissingServiceKey) {
            warnedMissingServiceKey = true;
            console.warn(
                "[supabase] SUPABASE_SERVICE_ROLE_KEY is not set, falling back to the anon key. " +
                "Admin routes will fail against a database with the RLS lockdown applied. " +
                "Add SUPABASE_SERVICE_ROLE_KEY to .env.local."
            );
        }
        return createClient(supabaseUrl, supabaseAnonKey);
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

// Client-side client (for browser/client components)
export function createBrowserSupabaseClient() {
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
