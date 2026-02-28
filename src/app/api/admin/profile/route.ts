import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { verifyAdmin, unauthorizedResponse } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function GET() {
    if (!(await verifyAdmin())) return unauthorizedResponse();

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
        .from("profile")
        .select("*")
        .eq("id", "main")
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function PUT(request: Request) {
    if (!(await verifyAdmin())) return unauthorizedResponse();

    const supabase = createServerSupabaseClient();
    const body = await request.json();

    const { data, error } = await supabase
        .from("profile")
        .update({ ...body, updated_at: new Date().toISOString() })
        .eq("id", "main")
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Profile is used on many pages
    revalidatePath("/[locale]", "page");
    revalidatePath("/[locale]/about", "page");
    revalidatePath("/[locale]/contact", "page");
    revalidatePath("/[locale]/services", "page");
    return NextResponse.json(data);
}
