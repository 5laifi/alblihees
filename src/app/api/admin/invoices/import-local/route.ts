import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdmin, unauthorizedResponse } from "@/lib/auth";
import { SetupRequiredError, getLocalPreviewInfo, importLocalPreview } from "@/lib/invoice-store";

// Development-only helper: moves data saved in the local preview file into
// Supabase. It does not exist in production builds (the file store is never
// used there), so it answers 404.
const isDev = process.env.NODE_ENV !== "production";

const bodySchema = z.object({ documents: z.boolean() });

export async function GET() {
    if (!isDev) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!(await verifyAdmin())) return unauthorizedResponse();
    try {
        return NextResponse.json({ preview: await getLocalPreviewInfo() });
    } catch {
        return NextResponse.json({ preview: null });
    }
}

export async function POST(request: Request) {
    if (!isDev) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!(await verifyAdmin())) return unauthorizedResponse();

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    try {
        return NextResponse.json({ result: await importLocalPreview(parsed.data) });
    } catch (error) {
        if (error instanceof SetupRequiredError) {
            return NextResponse.json({ error: error.message, code: "SETUP_REQUIRED" }, { status: 503 });
        }
        console.error("Local preview import failed:", error);
        return NextResponse.json({ error: "Import failed" }, { status: 500 });
    }
}
