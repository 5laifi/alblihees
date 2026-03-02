import { createServerSupabaseClient } from "./supabase";
import { unstable_cache } from "next/cache";

// Cached data fetching functions for server components.
// Data is cached for 60 seconds (revalidate: 60) to avoid
// redundant Supabase calls while keeping content fresh.

export const getProfile = unstable_cache(
    async () => {
        const supabase = createServerSupabaseClient();
        const { data } = await supabase.from("profile").select("*").eq("id", "main").single();
        return data;
    },
    ["profile"],
    { revalidate: 60 }
);

export const getServices = unstable_cache(
    async () => {
        const supabase = createServerSupabaseClient();
        const { data } = await supabase.from("services").select("*").order("sort_order");
        return data || [];
    },
    ["services"],
    { revalidate: 60 }
);

export const getExperienceStats = unstable_cache(
    async () => {
        const supabase = createServerSupabaseClient();
        const { data } = await supabase.from("experience_stats").select("*").order("sort_order");
        return data || [];
    },
    ["experience_stats"],
    { revalidate: 60 }
);

export const getExperienceTimeline = unstable_cache(
    async () => {
        const supabase = createServerSupabaseClient();
        const { data } = await supabase.from("experience_timeline").select("*").order("sort_order");
        return data || [];
    },
    ["experience_timeline"],
    { revalidate: 60 }
);

export const getOrganizations = unstable_cache(
    async () => {
        const supabase = createServerSupabaseClient();
        const { data } = await supabase.from("organizations").select("*").order("sort_order");
        return data || [];
    },
    ["organizations"],
    { revalidate: 60 }
);

export const getMediaItems = unstable_cache(
    async () => {
        const supabase = createServerSupabaseClient();
        const { data } = await supabase.from("media_items").select("*").order("sort_order");
        return data || [];
    },
    ["media_items"],
    { revalidate: 60 }
);

export const getSiteSettings = unstable_cache(
    async () => {
        const supabase = createServerSupabaseClient();
        const { data } = await supabase.from("site_settings").select("*");
        const settings: Record<string, string> = {};
        data?.forEach((row: { key: string; value: string }) => {
            settings[row.key] = row.value;
        });
        return settings;
    },
    ["site_settings"],
    { revalidate: 60 }
);
