import { createClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Server-side client (for server components, API routes)
export function createServerSupabaseClient() {
    return createClient(supabaseUrl, supabaseAnonKey);
}

// Client-side client (for browser/client components)
export function createBrowserSupabaseClient() {
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

// Privileged server-side client for admin-only tables (invoices).
// Requires the service role key, so those tables can keep RLS fully closed to
// the public anon key. There is deliberately no anon fallback: it would read
// as "connected but empty" and fail every write. Never import from client code.
export function createAdminSupabaseClient() {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
    return createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}
