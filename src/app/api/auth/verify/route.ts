import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth";

export async function GET() {
    const isAdmin = await verifyAdmin();
    return NextResponse.json({ authenticated: isAdmin });
}
