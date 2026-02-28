import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { verifyAdmin, unauthorizedResponse } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function revalidateMedia() {
    revalidatePath("/[locale]", "page");
    revalidatePath("/[locale]/media", "page");
}

export async function GET() {
    if (!(await verifyAdmin())) return unauthorizedResponse();

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
        .from("media_items")
        .select("*")
        .order("sort_order", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function POST(request: Request) {
    if (!(await verifyAdmin())) return unauthorizedResponse();

    const supabase = createServerSupabaseClient();
    const body = await request.json();

    const { data, error } = await supabase
        .from("media_items")
        .insert(body)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidateMedia();
    return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: Request) {
    if (!(await verifyAdmin())) return unauthorizedResponse();

    const supabase = createServerSupabaseClient();
    const body = await request.json();
    const { id, ...updates } = body;

    const { data, error } = await supabase
        .from("media_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidateMedia();
    return NextResponse.json(data);
}

export async function DELETE(request: Request) {
    if (!(await verifyAdmin())) return unauthorizedResponse();

    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const { error } = await supabase.from("media_items").delete().eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidateMedia();
    return NextResponse.json({ success: true });
}
