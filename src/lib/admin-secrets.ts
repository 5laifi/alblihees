import type { SupabaseClient } from "@supabase/supabase-js";

// Admin credentials live in the admin_secrets table, which has RLS enabled and
// no policies: only the privileged client (createAdminSupabaseClient) can touch it.
// They must never be stored in site_settings, which is partly public.
export const ADMIN_SECRET_KEYS = [
    "admin_password_hash",
    "password_reset_token",
    "password_reset_expires",
] as const;

export type AdminSecretKey = (typeof ADMIN_SECRET_KEYS)[number];

export function isAdminSecretKey(key: string): boolean {
    return (ADMIN_SECRET_KEYS as readonly string[]).includes(key);
}

// Returns null when the secret is not set. Throws on a real database error, so
// callers never mistake "could not read" for "not set".
export async function getAdminSecret(supabase: SupabaseClient, key: AdminSecretKey): Promise<string | null> {
    const { data, error } = await supabase
        .from("admin_secrets")
        .select("value")
        .eq("key", key)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to read admin secret "${key}": ${error.message}`);
    }
    return data?.value || null;
}

export async function setAdminSecret(supabase: SupabaseClient, key: AdminSecretKey, value: string): Promise<void> {
    const { error } = await supabase
        .from("admin_secrets")
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });

    if (error) {
        throw new Error(`Failed to save admin secret "${key}": ${error.message}`);
    }
}

export async function deleteAdminSecrets(supabase: SupabaseClient, keys: AdminSecretKey[]): Promise<void> {
    const { error } = await supabase.from("admin_secrets").delete().in("key", keys);

    if (error) {
        throw new Error(`Failed to delete admin secrets: ${error.message}`);
    }
}
