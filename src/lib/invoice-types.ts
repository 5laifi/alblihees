// Shared types and helpers for the invoice / quotation module.
// Safe to import from both client and server code (no Node APIs here).

export type DocumentType = "invoice" | "quotation";
export type PaymentStatus = "unpaid" | "partial" | "paid";
export type InvoiceTemplate = "stage" | "portrait" | "navy";
export type Numerals = "arabic" | "latin";

export interface InvoiceItem {
    id: string;
    description: string;
    price: number;
    quantity: number;
}

export interface InvoiceData {
    documentType: DocumentType;
    docNumber: number;
    /** ISO date, YYYY-MM-DD */
    issueDate: string;
    /** Optional service heading, e.g. "الإنتاج المسرحي" */
    category: string;
    projectName: string;
    clientName: string;
    items: InvoiceItem[];
    /** Percentage, 0-100 */
    discount: number;
    currency: string;
    notes: string;
    template: InvoiceTemplate;
}

/** What the browser may send when creating a document. The number is never
 *  accepted from the client: the server assigns it. */
export type NewInvoiceInput = Omit<InvoiceData, "docNumber">;

export interface SavedInvoice extends InvoiceData {
    id: string;
    createdAt: string;
    updatedAt: string;
    paymentStatus: PaymentStatus;
    amountPaid: number;
}

export interface InvoiceSettings {
    businessNameEn: string;
    tagline: string;
    phone: string;
    email: string;
    website: string;
    // Payment details (kept in the database, never in source code)
    payeeName: string;
    iban: string;
    accountNumber: string;
    accountName: string;
    // Liaison officer block
    liaisonTitle: string;
    liaisonName: string;
    liaisonPhone: string;
    showSignature: boolean;
    signatureUrl: string;
    // QR code
    qrUrl: string;
    // Terms shown above the payment details
    quotationTerms: string;
    invoiceTerms: string;
    numerals: Numerals;
    defaultTemplate: InvoiceTemplate;
    /** Numbering floor: the next automatic number is never below this value */
    startNumber: number;
}

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
    businessNameEn: "Thari Alblaihees",
    tagline: "شــــغــف يـــصــنــع أثــــر",
    phone: "",
    email: "Tharii@me.com",
    website: "www.alblaihees.com",
    payeeName: "",
    iban: "",
    accountNumber: "",
    accountName: "",
    liaisonTitle: "ضابط دائرة الإتصال",
    liaisonName: "",
    liaisonPhone: "",
    showSignature: true,
    signatureUrl: "/invoice/signature-placeholder.png",
    qrUrl: "https://www.alblaihees.com",
    quotationTerms: "عند الموافقة يتم دفع كامل المبلغ مقدماً عن طريق",
    invoiceTerms: "يتم دفع كامل المبلغ عن طريق",
    numerals: "arabic",
    defaultTemplate: "stage",
    startNumber: 1,
};

export const TEMPLATES: { key: InvoiceTemplate; label: string; hint: string }[] = [
    { key: "stage", label: "المسرح", hint: "صورة المسرح الداكنة" },
    { key: "portrait", label: "البورتريه", hint: "الخلفية الزرقاء مع الصورة الشخصية" },
    { key: "navy", label: "هوية الموقع", hint: "ألوان الموقع الكحلية" },
];

export const CURRENCIES: { code: string; symbol: string; label: string }[] = [
    { code: "KWD", symbol: "د.ك", label: "دينار كويتي" },
    { code: "SAR", symbol: "ر.س", label: "ريال سعودي" },
    { code: "AED", symbol: "د.إ", label: "درهم إماراتي" },
    { code: "QAR", symbol: "ر.ق", label: "ريال قطري" },
    { code: "BHD", symbol: "د.ب", label: "دينار بحريني" },
    { code: "OMR", symbol: "ر.ع", label: "ريال عماني" },
    { code: "USD", symbol: "$", label: "دولار أمريكي" },
];

export const DOC_LABELS: Record<DocumentType, string> = {
    invoice: "فاتورة",
    quotation: "عرض سعر",
};

export const STATUS_LABELS: Record<PaymentStatus, string> = {
    unpaid: "غير مدفوعة",
    partial: "مدفوعة جزئياً",
    paid: "مدفوعة",
};

export function currencySymbol(code: string): string {
    return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}

export function round3(n: number): number {
    return Math.round((n + Number.EPSILON) * 1000) / 1000;
}

export function calcTotals(items: InvoiceItem[], discount: number) {
    const subtotal = round3(
        items.reduce((acc, item) => acc + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0)
    );
    const pct = Math.min(100, Math.max(0, Number(discount) || 0));
    const discountAmount = round3((subtotal * pct) / 100);
    const total = round3(subtotal - discountAmount);
    return { subtotal, discountAmount, total };
}

// Both sides are rounded to fils so float noise from summed instalments
// (e.g. 1200.1399999999999) can never leave a fully paid invoice "partial".
export function statusForPayment(amountPaid: number, total: number): PaymentStatus {
    const paid = round3(amountPaid);
    if (paid > 0 && paid >= round3(total)) return "paid";
    if (paid > 0) return "partial";
    return "unpaid";
}

export function formatNumber(value: number, numerals: Numerals = "arabic", maxFraction = 3): string {
    const locale = numerals === "arabic" ? "ar-u-nu-arab" : "en-US";
    return new Intl.NumberFormat(locale, { maximumFractionDigits: maxFraction }).format(Number(value) || 0);
}

export function formatMoney(value: number, currency: string, numerals: Numerals = "arabic"): string {
    // No-break space: the currency must never wrap away from its amount.
    return `${formatNumber(value, numerals)}\u00A0${currencySymbol(currency)}`;
}

/** Converts Western digits inside a string (phone numbers etc.) to Arabic-Indic digits. */
export function toArabicDigits(input: string): string {
    return input.replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}

/** 2026-09-19 -> 19/9/2026 */
export function formatDocDate(iso: string): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    if (!m) return iso || "";
    return `${Number(m[3])}/${Number(m[2])}/${m[1]}`;
}

export function todayIso(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function newItemId(): string {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyInvoice(overrides: Partial<InvoiceData> = {}): InvoiceData {
    return {
        documentType: "quotation",
        docNumber: 1,
        issueDate: todayIso(),
        category: "",
        projectName: "",
        clientName: "",
        items: [],
        discount: 0,
        currency: "KWD",
        notes: "",
        template: "stage",
        ...overrides,
    };
}

export function docFileName(inv: Pick<InvoiceData, "documentType" | "docNumber" | "clientName">): string {
    const safeClient = (inv.clientName || "").replace(/[\\/:*?"<>|]+/g, " ").trim();
    return `${DOC_LABELS[inv.documentType]} ${inv.docNumber}${safeClient ? ` - ${safeClient}` : ""}.pdf`;
}
