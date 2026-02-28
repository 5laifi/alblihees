import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { verifyAdmin, unauthorizedResponse } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function revalidateExperience() {
    revalidatePath("/[locale]", "page");
    revalidatePath("/[locale]/experience", "page");
}

// GET stats and timeline
export async function GET(request: Request) {
    if (!(await verifyAdmin())) return unauthorizedResponse();

    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all";

    let statsData = null;
    let timelineData = null;

    if (type === "stats" || type === "all") {
        const result = await supabase
            .from("experience_stats")
            .select("*")
            .order("sort_order", { ascending: true });
        statsData = result.data;
    }

    if (type === "timeline" || type === "all") {
        const result = await supabase
            .from("experience_timeline")
            .select("*")
            .order("sort_order", { ascending: true });
        timelineData = result.data;
    }

    return NextResponse.json({
        stats: statsData || [],
        timeline: timelineData || [],
    });
}

export async function POST(request: Request) {
    if (!(await verifyAdmin())) return unauthorizedResponse();

    const supabase = createServerSupabaseClient();
    const body = await request.json();
    const { table, ...item } = body;

    const tableName = table === "stats" ? "experience_stats" : "experience_timeline";

    const { data, error } = await supabase
        .from(tableName)
        .insert(item)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidateExperience();
    return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: Request) {
    if (!(await verifyAdmin())) return unauthorizedResponse();

    const supabase = createServerSupabaseClient();
    const body = await request.json();
    const { table, id, ...updates } = body;

    const tableName = table === "stats" ? "experience_stats" : "experience_timeline";

    const { data, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidateExperience();
    return NextResponse.json(data);
}

export async function DELETE(request: Request) {
    if (!(await verifyAdmin())) return unauthorizedResponse();

    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const table = searchParams.get("table");

    if (!id || !table) return NextResponse.json({ error: "ID and table required" }, { status: 400 });

    const tableName = table === "stats" ? "experience_stats" : "experience_timeline";
    const { error } = await supabase.from(tableName).delete().eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidateExperience();
    return NextResponse.json({ success: true });
}
