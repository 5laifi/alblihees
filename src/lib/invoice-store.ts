// Server-only storage layer for invoices and quotations.
//
// Backends:
//   - "supabase": the `invoices` / `invoice_settings` tables (see supabase-invoices.sql)
//   - "local":    a JSON file under .data/ (development preview only, gitignored)
//
// Selection (override with INVOICE_STORAGE=supabase|local):
//   - SUPABASE_SERVICE_ROLE_KEY set            -> supabase
//   - otherwise, in development                -> local
//   - otherwise (production without the key)   -> SETUP_REQUIRED (fails closed)
// In development a missing table also falls back to the local file, so the
// feature can be previewed before the SQL migration has been run.

import { promises as fs } from "fs";
import path from "path";
import { createAdminSupabaseClient } from "./supabase";
import {
    DEFAULT_INVOICE_SETTINGS,
    calcTotals,
    round3,
    statusForPayment,
    type InvoiceData,
    type InvoiceSettings,
    type NewInvoiceInput,
    type SavedInvoice,
    withPaymentFallbacks,
} from "./invoice-types";

export type StorageBackend = "supabase" | "local";

export class SetupRequiredError extends Error {
    constructor() {
        super("Invoices storage is not configured: run supabase-invoices.sql and set SUPABASE_SERVICE_ROLE_KEY.");
        this.name = "SetupRequiredError";
    }
}

export class DuplicateNumberError extends Error {
    constructor() {
        super("A document of this type already uses this number.");
        this.name = "DuplicateNumberError";
    }
}

const isDev = process.env.NODE_ENV !== "production";
const DATA_FILE = path.join(process.cwd(), ".data", "invoices.json");

interface LocalData {
    invoices: SavedInvoice[];
    settings: Partial<InvoiceSettings>;
}

// Server clocks run in UTC; documents are dated by the business day in Kuwait
// (en-CA formats as YYYY-MM-DD).
function businessToday(): string {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuwait" }).format(new Date());
}

function preferredBackend(): StorageBackend {
    const forced = process.env.INVOICE_STORAGE;
    if (forced === "local" && isDev) return "local";
    if (forced === "supabase") return "supabase";
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) return "supabase";
    return isDev ? "local" : "supabase";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isMissingTable(error: any): boolean {
    const code = error?.code;
    const message = String(error?.message || "");
    return code === "42P01" || code === "PGRST205" || /could not find the table|does not exist/i.test(message);
}

// RLS denial: the tables exist but the key in use is not allowed to touch them.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isPermissionDenied(error: any): boolean {
    return error?.code === "42501" || /row-level security|permission denied/i.test(String(error?.message || ""));
}

// Unique (document_type, doc_number) violation.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rethrow(error: any): never {
    if (error?.code === "23505") throw new DuplicateNumberError();
    throw error;
}

function assertNumberFree(invoices: SavedInvoice[], candidate: Pick<SavedInvoice, "documentType" | "docNumber">, selfId?: string) {
    const clash = invoices.some(
        (inv) => inv.id !== selfId && inv.documentType === candidate.documentType && inv.docNumber === candidate.docNumber
    );
    if (clash) throw new DuplicateNumberError();
}

// ---------- local file backend ----------

async function readLocal(): Promise<LocalData> {
    try {
        const raw = await fs.readFile(DATA_FILE, "utf8");
        const parsed = JSON.parse(raw);
        return {
            invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
            settings: parsed.settings && typeof parsed.settings === "object" ? parsed.settings : {},
        };
    } catch {
        return { invoices: [], settings: {} };
    }
}

async function writeLocal(data: LocalData): Promise<void> {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    // Unique temp name: two writers must never share (and rename away) one temp file.
    const tmp = `${DATA_FILE}.${process.pid}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
    await fs.rename(tmp, DATA_FILE);
}

// Every local operation runs through one queue, so a read-modify-write can
// never interleave with another one (two saves at the same instant would
// otherwise lose a document or hand out the same number). The queue lives on
// globalThis because the dev server may load this module once per route.
const queueHolder = globalThis as typeof globalThis & { __invoiceLocalQueue?: Promise<unknown> };

function withLocalLock<T>(task: () => Promise<T>): Promise<T> {
    const previous = queueHolder.__invoiceLocalQueue ?? Promise.resolve();
    const next = previous.then(task, task);
    queueHolder.__invoiceLocalQueue = next.catch(() => undefined);
    return next;
}

// ---------- row mapping ----------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromRow(row: any): SavedInvoice {
    return {
        id: row.id,
        documentType: row.document_type === "invoice" ? "invoice" : "quotation",
        docNumber: Number(row.doc_number) || 0,
        issueDate: row.issue_date || "",
        category: row.category || "",
        projectName: row.project_name || "",
        clientName: row.client_name || "",
        items: Array.isArray(row.items) ? row.items : [],
        discount: Number(row.discount) || 0,
        currency: row.currency || "KWD",
        notes: row.notes || "",
        template: row.template || "stage",
        paymentStatus: row.payment_status || "unpaid",
        amountPaid: Number(row.amount_paid) || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function toRow(data: InvoiceData) {
    return {
        document_type: data.documentType,
        doc_number: data.docNumber,
        issue_date: data.issueDate,
        category: data.category,
        project_name: data.projectName,
        client_name: data.clientName,
        items: data.items,
        discount: data.discount,
        currency: data.currency,
        notes: data.notes,
        template: data.template,
    };
}

// Runs the Supabase operation, falling back to the local file in development
// when the tables have not been created yet.
async function run<T>(
    viaSupabase: () => Promise<T>,
    viaLocal: () => Promise<T>
): Promise<{ result: T; backend: StorageBackend }> {
    if (preferredBackend() === "local") {
        return { result: await withLocalLock(viaLocal), backend: "local" };
    }
    // Fail closed: without the service role key these RLS-locked tables would
    // look "connected but empty" and reject every write.
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new SetupRequiredError();
    try {
        return { result: await viaSupabase(), backend: "supabase" };
    } catch (error) {
        if (isMissingTable(error)) {
            if (isDev) return { result: await withLocalLock(viaLocal), backend: "local" };
            console.error("[invoices] storage not usable (missing table):", error);
            throw new SetupRequiredError();
        }
        if (isPermissionDenied(error)) {
            console.error("[invoices] storage not usable (permission denied):", error);
            throw new SetupRequiredError();
        }
        throw error;
    }
}

// ---------- public API ----------

export async function listInvoices() {
    const { result, backend } = await run<SavedInvoice[]>(
        async () => {
            const supabase = createAdminSupabaseClient();
            const { data, error } = await supabase
                .from("invoices")
                .select("*")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return (data || []).map(fromRow);
        },
        async () => {
            const local = await readLocal();
            return [...local.invoices].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        }
    );
    return { invoices: result, backend };
}

export async function getInvoice(id: string): Promise<SavedInvoice | null> {
    const { result } = await run<SavedInvoice | null>(
        async () => {
            const supabase = createAdminSupabaseClient();
            const { data, error } = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
            if (error) throw error;
            return data ? fromRow(data) : null;
        },
        async () => (await readLocal()).invoices.find((inv) => inv.id === id) || null
    );
    return result;
}

// Document numbers are assigned here, never taken from the browser. Every new
// document gets the next number in one shared sequence. The unique index on
// (document_type, doc_number) catches two simultaneous saves, and the loser
// simply retries with the following number.
export async function createInvoice(input: NewInvoiceInput): Promise<SavedInvoice> {
    const settings = await getInvoiceSettings();
    let lastError: unknown = new DuplicateNumberError();
    // Each retry re-reads the list, so the number is always "highest + 1" and
    // the sequence stays free of gaps even when saves collide.
    for (let attempt = 0; attempt < 8; attempt++) {
        const { invoices } = await listInvoices();
        const docNumber = nextDocNumber(invoices, settings);
        try {
            return await insertInvoice({ ...input, docNumber });
        } catch (error) {
            if (!(error instanceof DuplicateNumberError)) throw error;
            lastError = error;
        }
    }
    throw lastError;
}

// A quotation becomes an invoice that keeps the same number, so the client
// sees one reference on both papers. Fails if that invoice already exists.
export async function convertQuotationToInvoice(id: string): Promise<SavedInvoice | null> {
    const source = await getInvoice(id);
    if (!source || source.documentType !== "quotation") return null;
    return insertInvoice({
        documentType: "invoice",
        docNumber: source.docNumber,
        issueDate: businessToday(),
        category: source.category,
        projectName: source.projectName,
        clientName: source.clientName,
        items: source.items,
        discount: source.discount,
        currency: source.currency,
        notes: source.notes,
        template: source.template,
    });
}

async function insertInvoice(data: InvoiceData): Promise<SavedInvoice> {
    const { result } = await run<SavedInvoice>(
        async () => {
            const supabase = createAdminSupabaseClient();
            const { data: row, error } = await supabase.from("invoices").insert(toRow(data)).select().single();
            if (error) rethrow(error);
            return fromRow(row);
        },
        async () => {
            const local = await readLocal();
            assertNumberFree(local.invoices, data);
            const now = new Date().toISOString();
            const saved: SavedInvoice = {
                ...data,
                id: crypto.randomUUID(),
                createdAt: now,
                updatedAt: now,
                paymentStatus: "unpaid",
                amountPaid: 0,
            };
            local.invoices.push(saved);
            await writeLocal(local);
            return saved;
        }
    );
    return result;
}

// The number is fixed for the life of the document.
export interface InvoiceUpdate extends Partial<NewInvoiceInput> {
    amountPaid?: number;
}

export async function updateInvoice(id: string, update: InvoiceUpdate): Promise<SavedInvoice | null> {
    const existing = await getInvoice(id);
    if (!existing) return null;

    const { amountPaid, ...fields } = update;
    const merged: SavedInvoice = { ...existing, ...fields };
    merged.amountPaid = amountPaid !== undefined ? round3(Math.max(0, amountPaid)) : existing.amountPaid;
    // Status is always derived on the server so it cannot drift from the totals.
    merged.paymentStatus = statusForPayment(merged.amountPaid, calcTotals(merged.items, merged.discount).total);
    merged.updatedAt = new Date().toISOString();

    const { result } = await run<SavedInvoice | null>(
        async () => {
            const supabase = createAdminSupabaseClient();
            const { data: row, error } = await supabase
                .from("invoices")
                .update({
                    ...toRow(merged),
                    amount_paid: merged.amountPaid,
                    payment_status: merged.paymentStatus,
                    updated_at: merged.updatedAt,
                })
                .eq("id", id)
                .select()
                .single();
            if (error) rethrow(error);
            return fromRow(row);
        },
        async () => {
            const local = await readLocal();
            const index = local.invoices.findIndex((inv) => inv.id === id);
            if (index === -1) return null;
            assertNumberFree(local.invoices, merged, id);
            local.invoices[index] = merged;
            await writeLocal(local);
            return merged;
        }
    );
    return result;
}

export async function deleteInvoice(id: string): Promise<void> {
    await run<void>(
        async () => {
            const supabase = createAdminSupabaseClient();
            const { error } = await supabase.from("invoices").delete().eq("id", id);
            if (error) throw error;
        },
        async () => {
            const local = await readLocal();
            local.invoices = local.invoices.filter((inv) => inv.id !== id);
            await writeLocal(local);
        }
    );
}

export async function getInvoiceSettings(): Promise<InvoiceSettings> {
    const { result } = await run<Partial<InvoiceSettings>>(
        async () => {
            const supabase = createAdminSupabaseClient();
            const { data, error } = await supabase
                .from("invoice_settings")
                .select("data")
                .eq("id", "main")
                .maybeSingle();
            if (error) throw error;
            return (data?.data as Partial<InvoiceSettings>) || {};
        },
        async () => (await readLocal()).settings
    );
    return withPaymentFallbacks({ ...DEFAULT_INVOICE_SETTINGS, ...result });
}

export async function saveInvoiceSettings(settings: InvoiceSettings): Promise<InvoiceSettings> {
    await run<void>(
        async () => {
            const supabase = createAdminSupabaseClient();
            const { error } = await supabase
                .from("invoice_settings")
                .upsert({ id: "main", data: settings, updated_at: new Date().toISOString() });
            if (error) throw error;
        },
        async () => {
            const local = await readLocal();
            local.settings = settings;
            await writeLocal(local);
        }
    );
    return settings;
}

export function nextDocNumber(invoices: SavedInvoice[], settings: InvoiceSettings): number {
    const max = invoices.reduce((acc, inv) => Math.max(acc, inv.docNumber || 0), 0);
    return Math.max(max + 1, settings.startNumber || 1, 1);
}

// ---------- one-time move from the local preview file to the database ----------
// Development only. Lets the settings (and optionally the documents) created
// while previewing on this machine be carried into Supabase once the service
// role key is configured, so nothing has to be typed again.

export interface LocalPreviewInfo {
    documents: number;
    hasSettings: boolean;
}

export async function getLocalPreviewInfo(): Promise<LocalPreviewInfo | null> {
    if (!isDev || preferredBackend() !== "supabase") return null;
    const local = await withLocalLock(readLocal);
    const hasSettings = Object.values(local.settings).some((value) => value !== "" && value != null);
    if (!hasSettings && local.invoices.length === 0) return null;
    return { documents: local.invoices.length, hasSettings };
}

export async function importLocalPreview(options: { documents: boolean }) {
    if (!isDev) throw new Error("Local preview import is only available in development");
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new SetupRequiredError();

    const supabase = createAdminSupabaseClient();
    const local = await withLocalLock(readLocal);
    const result = { settings: false, imported: 0, skipped: 0 };

    try {
        // Settings: only fill an empty database, never overwrite saved ones.
        const { data: existing, error: readError } = await supabase
            .from("invoice_settings")
            .select("id")
            .eq("id", "main")
            .maybeSingle();
        if (readError) throw readError;
        if (!existing && Object.keys(local.settings).length > 0) {
            const { error } = await supabase.from("invoice_settings").insert({
                id: "main",
                data: { ...DEFAULT_INVOICE_SETTINGS, ...local.settings },
            });
            if (error) throw error;
            result.settings = true;
        }

        if (options.documents) {
            for (const doc of local.invoices) {
                const { error } = await supabase.from("invoices").insert({
                    ...toRow(doc),
                    amount_paid: doc.amountPaid,
                    payment_status: doc.paymentStatus,
                    created_at: doc.createdAt,
                    updated_at: doc.updatedAt,
                });
                if (!error) result.imported++;
                else if (error.code === "23505") result.skipped++; // same type and number already there
                else throw error;
            }
        }
    } catch (error) {
        if (isMissingTable(error) || isPermissionDenied(error)) throw new SetupRequiredError();
        throw error;
    }

    // Keep the file as a dated backup so the import is never offered twice.
    await withLocalLock(async () => {
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        await fs.rename(DATA_FILE, path.join(path.dirname(DATA_FILE), `invoices.imported-${stamp}.json`)).catch(() => undefined);
    });
    return result;
}
