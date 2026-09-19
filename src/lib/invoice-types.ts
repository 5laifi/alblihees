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
    // Payment details, printed on invoices only (never on quotations).
    // Saved values win; an empty field falls back to the built-in default.
    showPaymentDetails: boolean;
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
    phone: "+96551414145",
    email: "Tharii@me.com",
    website: "www.alblaihees.com",
    showPaymentDetails: true,
    payeeName: "ضارى مشعل حمد البليهيس",
    iban: "KW33BBYN0000000000000159489007",
    accountNumber: "0159489007",
    accountName: "DHARI M H ALBLAIHEES",
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

/** Settings that fall back to the built-in value when saved empty. */
export const PAYMENT_DETAIL_KEYS = ["payeeName", "iban", "accountNumber", "accountName", "invoiceTerms"] as const;

/** Fills empty payment fields from DEFAULT_INVOICE_SETTINGS; everything else is kept as saved. */
export function withPaymentFallbacks(settings: InvoiceSettings): InvoiceSettings {
    const next = { ...settings };
    for (const key of PAYMENT_DETAIL_KEYS) {
        if (!String(next[key] ?? "").trim()) next[key] = DEFAULT_INVOICE_SETTINGS[key];
    }
    return next;
}

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

// ---------- Admin console helpers (English UI) ----------
// The printed document stays Arabic (DOC_LABELS, STATUS_LABELS above). The
// admin screens around it are English, like the rest of the console.

export const DOC_LABELS_EN: Record<DocumentType, string> = {
    invoice: "Invoice",
    quotation: "Quotation",
};

export const DOC_LABELS_EN_PLURAL: Record<DocumentType, string> = {
    invoice: "Invoices",
    quotation: "Quotations",
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; tone: "red" | "amber" | "green" }> = {
    unpaid: { label: "Unpaid", tone: "red" },
    partial: { label: "Partially paid", tone: "amber" },
    paid: { label: "Paid", tone: "green" },
};

export const TEMPLATE_LABELS_EN: Record<InvoiceTemplate, { label: string; hint: string }> = {
    stage: { label: "Stage", hint: "Dark stage photo header" },
    portrait: { label: "Portrait", hint: "Blue header with the portrait" },
    navy: { label: "Site identity", hint: "The website's navy colors" },
};

export const CURRENCY_LABELS_EN: Record<string, string> = {
    KWD: "Kuwaiti Dinar",
    SAR: "Saudi Riyal",
    AED: "UAE Dirham",
    QAR: "Qatari Riyal",
    BHD: "Bahraini Dinar",
    OMR: "Omani Rial",
    USD: "US Dollar",
};

export function currencyLabelEn(code: string): string {
    return CURRENCY_LABELS_EN[code] ?? code;
}

/** "KWD 1,215.5" — code first, Latin digits, up to 3 decimals. For admin lists and tiles. */
export function formatAmount(value: number, currency: string): string {
    return `${currency} ${formatNumber(value, "latin")}`;
}

/** Per-currency amounts joined, primary currency first: "KWD 715 · USD 500". */
export function formatAmountMap(map: Record<string, number>, empty = "KWD 0", primary = "KWD"): string {
    const entries = Object.entries(map).filter(([, amount]) => Number.isFinite(amount));
    if (entries.length === 0) return empty;
    entries.sort(([a], [b]) => (a === primary ? -1 : b === primary ? 1 : a.localeCompare(b)));
    return entries.map(([code, amount]) => formatAmount(amount, code)).join(" · ");
}

/** "18 Sep 2026" from YYYY-MM-DD; falls back to the raw value. */
export function formatDateEn(iso: string): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    if (!m) return iso || "—";
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

/** What is still owed on an invoice (never negative). */
export function remainingAmount(inv: Pick<SavedInvoice, "items" | "discount" | "amountPaid">): number {
    return Math.max(0, round3(calcTotals(inv.items, inv.discount).total - (inv.amountPaid || 0)));
}

export interface DocumentSummary {
    quotations: number;
    invoices: number;
    unpaid: number;
    partial: number;
    paid: number;
    /** Outstanding amount per currency, e.g. { KWD: 1200.5 } */
    outstanding: Record<string, number>;
    /** Newest documents first (the list is already sorted by the server) */
    recent: SavedInvoice[];
}

export function summarizeDocuments(list: SavedInvoice[], recentCount = 5): DocumentSummary {
    const invoices = list.filter((doc) => doc.documentType === "invoice");
    const outstanding: Record<string, number> = {};
    for (const inv of invoices) {
        const remaining = remainingAmount(inv);
        if (remaining > 0) outstanding[inv.currency] = round3((outstanding[inv.currency] || 0) + remaining);
    }
    return {
        quotations: list.length - invoices.length,
        invoices: invoices.length,
        unpaid: invoices.filter((inv) => inv.paymentStatus === "unpaid").length,
        partial: invoices.filter((inv) => inv.paymentStatus === "partial").length,
        paid: invoices.filter((inv) => inv.paymentStatus === "paid").length,
        outstanding,
        recent: list.slice(0, recentCount),
    };
}
