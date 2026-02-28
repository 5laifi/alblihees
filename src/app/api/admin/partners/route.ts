import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { verifyAdmin, unauthorizedResponse } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function revalidatePartners() {
    revalidatePath("/[locale]", "page");
    revalidatePath("/[locale]/partners", "page");
    revalidatePath("/[locale]/experience", "page");
}

export async function GET() {
    if (!(await verifyAdmin())) return unauthorizedResponse();

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
        .from("organizations")
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
        .from("organizations")
        .insert(body)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidatePartners();
    return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: Request) {
    if (!(await verifyAdmin())) return unauthorizedResponse();

    const supabase = createServerSupabaseClient();
    const body = await request.json();
    const { id, ...updates } = body;

    const { data, error } = await supabase
        .from("organizations")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidatePartners();
    return NextResponse.json(data);
}

export async function DELETE(request: Request) {
    if (!(await verifyAdmin())) return unauthorizedResponse();

    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const { error } = await supabase.from("organizations").delete().eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    revalidatePartners();
    return NextResponse.json({ success: true });
}
