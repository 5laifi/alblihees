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

const getSiteSettingsCached = unstable_cache(
    async () => {
        const supabase = createServerSupabaseClient();
        const { data, error } = await supabase.from("site_settings").select("*");
        // Throwing keeps a failed read out of the cache. Next.js then goes on
        // serving the last good settings instead of caching an empty result,
        // which used to make the home page drop its background video.
        if (error) throw new Error(`site_settings read failed: ${error.message}`);
        const settings: Record<string, string> = {};
        data?.forEach((row: { key: string; value: string }) => {
            settings[row.key] = row.value;
        });
        return settings;
    },
    ["site_settings"],
    { revalidate: 60 }
);

export async function getSiteSettings(): Promise<Record<string, string>> {
    try {
        return await getSiteSettingsCached();
    } catch (error) {
        // No cached copy yet and the database is unreachable: render with defaults
        // rather than failing the whole page. Nothing is cached, so the next
        // request tries again straight away.
        console.error(error);
        return {};
    }
}
