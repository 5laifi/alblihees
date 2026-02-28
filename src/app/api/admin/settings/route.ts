import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { verifyAdmin, unauthorizedResponse } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function GET() {
    if (!(await verifyAdmin())) return unauthorizedResponse();

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
        .from("site_settings")
        .select("*");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Convert array to key-value object
    const settings: Record<string, string> = {};
    data?.forEach((row: { key: string; value: string }) => {
        settings[row.key] = row.value;
    });

    return NextResponse.json(settings);
}

export async function PUT(request: Request) {
    if (!(await verifyAdmin())) return unauthorizedResponse();

    const supabase = createServerSupabaseClient();
    const body = await request.json();
    const { key, value } = body;

    if (!key) return NextResponse.json({ error: "Key is required" }, { status: 400 });

    // Try update first, if no rows affected then insert
    const { data: existing } = await supabase
        .from("site_settings")
        .select("id")
        .eq("key", key)
        .single();

    let result;
    if (existing) {
        // Update existing
        result = await supabase
            .from("site_settings")
            .update({ value, updated_at: new Date().toISOString() })
            .eq("key", key)
            .select()
            .single();
    } else {
        // Insert new
        result = await supabase
            .from("site_settings")
            .insert({ key, value, updated_at: new Date().toISOString() })
            .select()
            .single();
    }

    if (result.error) {
        console.error("Settings save error:", result.error);
        return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    // Settings can affect any page
    revalidatePath("/[locale]", "layout");

    return NextResponse.json(result.data);
}
