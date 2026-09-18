import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdmin, unauthorizedResponse } from "@/lib/auth";
import {
    DuplicateNumberError,
    SetupRequiredError,
    convertQuotationToInvoice,
    createInvoice,
    deleteInvoice,
    getInvoice,
    getInvoiceSettings,
    listInvoices,
    nextDocNumber,
    updateInvoice,
} from "@/lib/invoice-store";

const itemSchema = z.object({
    id: z.string().min(1).max(64),
    description: z.string().trim().min(1).max(2000),
    price: z.number().finite().min(0).max(1_000_000_000),
    quantity: z.number().finite().min(0).max(1_000_000),
});

// No docNumber here on purpose: numbers are assigned by the server and can
// never be set or changed from the browser (unknown keys are stripped by zod).
const invoiceSchema = z.object({
    documentType: z.enum(["invoice", "quotation"]),
    issueDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        // a real calendar day (2026-02-31 would otherwise reach Postgres and fail there)
        .refine((v) => {
            const d = new Date(`${v}T00:00:00Z`);
            return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
        }, "Invalid date"),
    category: z.string().trim().max(120),
    projectName: z.string().trim().min(1).max(300),
    clientName: z.string().trim().min(1).max(300),
    items: z.array(itemSchema).max(100),
    discount: z.number().finite().min(0).max(100),
    currency: z.string().trim().min(1).max(8),
    notes: z.string().max(4000),
    template: z.enum(["stage", "portrait", "navy"]),
});

const convertSchema = z.object({ convertFromId: z.string().min(1).max(64) });

const updateSchema = invoiceSchema.partial().extend({
    id: z.string().min(1).max(64),
    amountPaid: z.number().finite().min(0).max(1_000_000_000).optional(),
});

function failure(error: unknown) {
    if (error instanceof SetupRequiredError) {
        return NextResponse.json({ error: error.message, code: "SETUP_REQUIRED" }, { status: 503 });
    }
    if (error instanceof DuplicateNumberError) {
        return NextResponse.json({ error: error.message, code: "DUPLICATE_NUMBER" }, { status: 409 });
    }
    console.error("Invoices API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}

async function readJson(request: Request): Promise<unknown> {
    try {
        return await request.json();
    } catch {
        return null;
    }
}

export async function GET(request: Request) {
    if (!(await verifyAdmin())) return unauthorizedResponse();

    try {
        const id = new URL(request.url).searchParams.get("id");
        if (id) {
            const invoice = await getInvoice(id);
            if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
            return NextResponse.json({ invoice });
        }

        const [{ invoices, backend }, settings] = await Promise.all([listInvoices(), getInvoiceSettings()]);
        return NextResponse.json({
            invoices,
            nextNumber: nextDocNumber(invoices, settings),
            storage: backend,
        });
    } catch (error) {
        return failure(error);
    }
}

export async function POST(request: Request) {
    if (!(await verifyAdmin())) return unauthorizedResponse();

    const body = await readJson(request);

    // Quotation -> invoice keeps the quotation's number.
    const conversion = convertSchema.safeParse(body);
    if (conversion.success) {
        try {
            const invoice = await convertQuotationToInvoice(conversion.data.convertFromId);
            if (!invoice) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
            return NextResponse.json({ invoice }, { status: 201 });
        } catch (error) {
            return failure(error);
        }
    }

    const parsed = invoiceSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid invoice data", issues: parsed.error.issues }, { status: 400 });
    }

    try {
        const invoice = await createInvoice(parsed.data);
        return NextResponse.json({ invoice }, { status: 201 });
    } catch (error) {
        return failure(error);
    }
}

export async function PUT(request: Request) {
    if (!(await verifyAdmin())) return unauthorizedResponse();

    const parsed = updateSchema.safeParse(await readJson(request));
    if (!parsed.success) {
        return NextResponse.json({ error: "Invalid invoice data", issues: parsed.error.issues }, { status: 400 });
    }

    try {
        const { id, ...update } = parsed.data;
        const invoice = await updateInvoice(id, update);
        if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ invoice });
    } catch (error) {
        return failure(error);
    }
}

export async function DELETE(request: Request) {
    if (!(await verifyAdmin())) return unauthorizedResponse();

    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    try {
        await deleteInvoice(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return failure(error);
    }
}
