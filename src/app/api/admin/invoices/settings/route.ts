import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdmin, unauthorizedResponse } from "@/lib/auth";
import { SetupRequiredError, getInvoiceSettings, saveInvoiceSettings } from "@/lib/invoice-store";

// Only same-site paths or http(s) URLs are accepted for images and links.
const safeUrl = z
    .string()
    .trim()
    .max(500)
    .refine((value) => value === "" || /^(https?:\/\/|\/(?!\/))/i.test(value), "Invalid URL");

const settingsSchema = z.object({
    businessNameEn: z.string().trim().max(120),
    tagline: z.string().trim().max(160),
    phone: z.string().trim().max(40),
    email: z.string().trim().max(160),
    website: z.string().trim().max(160),
    payeeName: z.string().trim().max(160),
    iban: z.string().trim().max(64),
    accountNumber: z.string().trim().max(64),
    accountName: z.string().trim().max(160),
    liaisonTitle: z.string().trim().max(120),
    liaisonName: z.string().trim().max(160),
    liaisonPhone: z.string().trim().max(40),
    showSignature: z.boolean(),
    signatureUrl: safeUrl,
    qrUrl: z.string().trim().max(500),
    quotationTerms: z.string().trim().max(600),
    invoiceTerms: z.string().trim().max(600),
    numerals: z.enum(["arabic", "latin"]),
    defaultTemplate: z.enum(["stage", "portrait", "navy"]),
    startNumber: z.number().int().min(1).max(100_000_000),
});

function failure(error: unknown) {
    if (error instanceof SetupRequiredError) {
        return NextResponse.json({ error: error.message, code: "SETUP_REQUIRED" }, { status: 503 });
    }
    console.error("Invoice settings API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}

export async function GET() {
    if (!(await verifyAdmin())) return unauthorizedResponse();
    try {
        return NextResponse.json({ settings: await getInvoiceSettings() });
    } catch (error) {
        return failure(error);
    }
}

export async function PUT(request: Request) {
    if (!(await verifyAdmin())) return unauthorizedResponse();

    let body: unknown = null;
    try {
        body = await request.json();
    } catch {
        body = null;
    }

    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid settings", issues: parsed.error.issues }, { status: 400 });
    }

    try {
        return NextResponse.json({ settings: await saveInvoiceSettings(parsed.data) });
    } catch (error) {
        return failure(error);
    }
}
