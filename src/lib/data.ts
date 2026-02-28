import { createServerSupabaseClient } from "./supabase";

// Shared data fetching functions for server components.
// These replace the old static imports from src/data/*.ts.
// Using { cache: 'no-store' } to always get fresh data.

export async function getProfile() {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase.from("profile").select("*").eq("id", "main").single();
    return data;
}

export async function getServices() {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase.from("services").select("*").order("sort_order");
    return data || [];
}

export async function getExperienceStats() {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase.from("experience_stats").select("*").order("sort_order");
    return data || [];
}

export async function getExperienceTimeline() {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase.from("experience_timeline").select("*").order("sort_order");
    return data || [];
}

export async function getOrganizations() {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase.from("organizations").select("*").order("sort_order");
    return data || [];
}

export async function getMediaItems() {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase.from("media_items").select("*").order("sort_order");
    return data || [];
}

export async function getSiteSettings() {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase.from("site_settings").select("*");
    const settings: Record<string, string> = {};
    data?.forEach((row: { key: string; value: string }) => {
        settings[row.key] = row.value;
    });
    return settings;
}
