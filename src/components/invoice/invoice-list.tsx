"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Banknote, Copy, Eye, FileOutput, FileText, Loader2, MoreHorizontal, Pencil, Printer, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, StatusPill } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    DOC_LABELS,
    DOC_LABELS_PLURAL,
    PAYMENT_STATUS_META_AR,
    calcTotals,
    formatDocDate,
    formatMoney,
    todayIso,
    type DocumentType,
    type InvoiceSettings,
    type NewInvoiceInput,
    type SavedInvoice,
} from "@/lib/invoice-types";
import { InvoiceDocument } from "./invoice-document";
import { PaymentDialog } from "./payment-dialog";
import { ScaledPreview } from "./scaled-preview";

interface InvoiceListProps {
    documentType: DocumentType;
    invoices: SavedInvoice[];
    settings: InvoiceSettings;
    onEdit: (invoice: SavedInvoice) => void;
    onChanged: () => void;
}

// "No invoices" needs the indefinite plural; DOC_LABELS_PLURAL is the definite form.
const EMPTY_TITLES: Record<DocumentType, string> = {
    invoice: "لا توجد فواتير",
    quotation: "لا توجد عروض أسعار",
};

// A copy never carries the old number: the server gives it the next one.
function toCopyPayload(inv: SavedInvoice): NewInvoiceInput {
    const { documentType, category, projectName, clientName, items, discount, currency, notes, template } = inv;
    return { documentType, issueDate: todayIso(), category, projectName, clientName, items, discount, currency, notes, template };
}

// Arabic counting: 1 and 2 have their own forms, 3-10 take the plural, 11+ the singular.
function itemsLabel(count: number): string {
    if (count === 0) return "لا توجد خدمات";
    if (count === 1) return "خدمة واحدة";
    if (count === 2) return "خدمتان";
    if (count <= 10) return `${count} خدمات`;
    return `${count} خدمة`;
}

/** Instalments received so far are shown until the invoice is settled. */
function showPaidLine(inv: SavedInvoice): boolean {
    return inv.amountPaid > 0 && inv.paymentStatus !== "paid";
}

interface RowActionHandlers {
    preview: (inv: SavedInvoice) => void;
    print: (inv: SavedInvoice) => void;
    edit: (inv: SavedInvoice) => void;
    pay: (inv: SavedInvoice) => void;
    convert: (inv: SavedInvoice) => void;
    copy: (inv: SavedInvoice) => void;
    requestDelete: (inv: SavedInvoice) => void;
}

/** The "…" menu on every row. Shared by the table and the stacked mobile rows. */
function RowActions({
    invoice,
    documentType,
    creating,
    actions,
}: {
    invoice: SavedInvoice;
    documentType: DocumentType;
    creating: boolean;
    actions: RowActionHandlers;
}) {
    return (
        <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">الإجراءات</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onSelect={() => actions.preview(invoice)}>
                    <Eye /> معاينة
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => actions.print(invoice)}>
                    <Printer /> طباعة / PDF
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => actions.edit(invoice)}>
                    <Pencil /> تعديل
                </DropdownMenuItem>
                {documentType === "invoice" ? (
                    <DropdownMenuItem onSelect={() => actions.pay(invoice)}>
                        <Banknote /> تسجيل دفعة
                    </DropdownMenuItem>
                ) : (
                    <DropdownMenuItem disabled={creating} onSelect={() => actions.convert(invoice)}>
                        <FileOutput /> تحويل إلى فاتورة
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem disabled={creating} onSelect={() => actions.copy(invoice)}>
                    <Copy /> نسخ برقم جديد
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    className="text-red-600 focus:text-red-600 dark:text-red-400"
                    onSelect={() => actions.requestDelete(invoice)}
                >
                    <Trash2 /> حذف
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function InvoiceList({ documentType, invoices, settings, onEdit, onChanged }: InvoiceListProps) {
    const locale = useLocale();
    const [query, setQuery] = useState("");
    const [preview, setPreview] = useState<SavedInvoice | null>(null);
    const [paying, setPaying] = useState<SavedInvoice | null>(null);
    const [creating, setCreating] = useState(false);
    // The document waiting for delete confirmation, and whether its request is in flight.
    const [deleting, setDeleting] = useState<SavedInvoice | null>(null);
    const [removing, setRemoving] = useState(false);

    const label = DOC_LABELS[documentType];
    const plural = DOC_LABELS_PLURAL[documentType];
    const isInvoice = documentType === "invoice";

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return invoices
            .filter((inv) => inv.documentType === documentType)
            .filter(
                (inv) =>
                    !q ||
                    inv.clientName.toLowerCase().includes(q) ||
                    inv.projectName.toLowerCase().includes(q) ||
                    String(inv.docNumber).includes(q)
            );
    }, [invoices, documentType, query]);

    function openPrint(inv: SavedInvoice) {
        window.open(`/${locale}/admin/invoices/print/${inv.id}`, "_blank", "noopener");
    }

    // `body` is either a copy payload or { convertFromId }. The number always
    // comes back from the server.
    async function create(body: NewInvoiceInput | { convertFromId: string }, kind: "copy" | "convert") {
        if (creating) return; // a double click must not create two documents
        setCreating(true);
        try {
            const res = await fetch("/api/admin/invoices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json().catch(() => ({}));
            if (res.status === 409) {
                toast.error(
                    kind === "convert"
                        ? "تم تحويل عرض السعر هذا إلى فاتورة من قبل."
                        : "تعذر إعطاء رقم جديد، حاول مرة أخرى."
                );
                return;
            }
            if (!res.ok || !data.invoice) throw new Error();
            toast.success(
                kind === "convert"
                    ? `تم إنشاء فاتورة رقم ${data.invoice.docNumber} من عرض السعر`
                    : `تم إنشاء نسخة برقم ${data.invoice.docNumber}`
            );
            onChanged();
        } catch {
            toast.error("تعذر تنفيذ العملية.");
        } finally {
            setCreating(false);
        }
    }

    // Runs after the user confirms in the delete dialog. On failure the dialog
    // stays open so they can retry or cancel.
    async function remove(inv: SavedInvoice) {
        setRemoving(true);
        try {
            const res = await fetch(`/api/admin/invoices?id=${encodeURIComponent(inv.id)}`, { method: "DELETE" });
            if (!res.ok) throw new Error();
            toast.success("تم الحذف");
            setDeleting(null);
            onChanged();
        } catch {
            toast.error("تعذر الحذف.");
        } finally {
            setRemoving(false);
        }
    }

    const actions: RowActionHandlers = {
        preview: setPreview,
        print: openPrint,
        edit: onEdit,
        pay: setPaying,
        convert: (inv) => create({ convertFromId: inv.id }, "convert"),
        copy: (inv) => create(toCopyPayload(inv), "copy"),
        requestDelete: setDeleting,
    };

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    dir="auto"
                    placeholder="ابحث باسم العميل أو المشروع أو رقم المستند..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="ps-9"
                    aria-label={`البحث في ${plural}`}
                />
            </div>

            {visible.length === 0 ? (
                <div className="rounded-xl border bg-card shadow-sm">
                    <EmptyState
                        icon={FileText}
                        title={EMPTY_TITLES[documentType]}
                        description={query ? "جرّب كلمة بحث مختلفة." : `أنشئ أول ${label} من تبويب «إنشاء جديد».`}
                    />
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border bg-card shadow-sm animate-in fade-in-0 duration-200">
                    {/* lg and up: table (below that the sidebar leaves too little width for six columns) */}
                    <div className="hidden overflow-x-auto lg:block">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40 hover:bg-muted/40">
                                    <TableHead className="w-16 whitespace-nowrap ps-5 pe-4 text-start">#</TableHead>
                                    <TableHead className="px-4 text-start">العميل / المشروع</TableHead>
                                    <TableHead className="whitespace-nowrap px-4 text-start">التاريخ</TableHead>
                                    <TableHead className="whitespace-nowrap px-4 text-end">الإجمالي</TableHead>
                                    <TableHead className="whitespace-nowrap px-4 text-start">{isInvoice ? "حالة الدفع" : "عدد الخدمات"}</TableHead>
                                    <TableHead className="w-14 ps-4 pe-5 text-start">
                                        <span className="sr-only">الإجراءات</span>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {visible.map((inv) => {
                                    const { total } = calcTotals(inv.items, inv.discount);
                                    const status = PAYMENT_STATUS_META_AR[inv.paymentStatus];
                                    return (
                                        <TableRow key={inv.id}>
                                            <TableCell className="py-3 ps-5 pe-4 font-medium tabular-nums">
                                                <span dir="ltr">#{inv.docNumber}</span>
                                            </TableCell>
                                            <TableCell className="px-4 py-3">
                                                <div className="max-w-[28rem]">
                                                    <p dir="auto" className="truncate text-start font-medium">
                                                        {inv.clientName || "—"}
                                                    </p>
                                                    {inv.projectName && (
                                                        <p dir="auto" className="truncate text-start text-xs text-muted-foreground">
                                                            {inv.projectName}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                                                <span dir="ltr">{formatDocDate(inv.issueDate)}</span>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap px-4 py-3 text-end font-semibold tabular-nums">
                                                <bdi>{formatMoney(total, inv.currency, "latin")}</bdi>
                                            </TableCell>
                                            <TableCell className="px-4 py-3">
                                                {isInvoice ? (
                                                    <div className="flex flex-col items-start gap-1">
                                                        <StatusPill tone={status.tone}>{status.label}</StatusPill>
                                                        {showPaidLine(inv) && (
                                                            <span className="text-xs tabular-nums text-muted-foreground">
                                                                المدفوع: <bdi>{formatMoney(inv.amountPaid, inv.currency, "latin")}</bdi>
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">{itemsLabel(inv.items.length)}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-3 ps-4 pe-5 text-end">
                                                <RowActions invoice={inv} documentType={documentType} creating={creating} actions={actions} />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    {/* below lg: stacked rows with the same information */}
                    <ul className="lg:hidden">
                        {visible.map((inv) => {
                            const { total } = calcTotals(inv.items, inv.discount);
                            const status = PAYMENT_STATUS_META_AR[inv.paymentStatus];
                            return (
                                <li key={inv.id} className="flex items-start justify-between gap-3 border-b p-4 last:border-b-0">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline gap-2">
                                            <span dir="ltr" className="shrink-0 text-sm font-medium tabular-nums">
                                                #{inv.docNumber}
                                            </span>
                                            <p dir="auto" className="min-w-0 truncate text-start text-sm font-medium">
                                                {inv.clientName || "—"}
                                            </p>
                                        </div>
                                        {inv.projectName && (
                                            <p dir="auto" className="mt-0.5 truncate text-start text-xs text-muted-foreground">
                                                {inv.projectName}
                                            </p>
                                        )}
                                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                                            <span dir="ltr" className="whitespace-nowrap">
                                                {formatDocDate(inv.issueDate)}
                                            </span>
                                            <bdi className="whitespace-nowrap font-semibold tabular-nums text-foreground">
                                                {formatMoney(total, inv.currency, "latin")}
                                            </bdi>
                                            {isInvoice ? (
                                                <StatusPill tone={status.tone}>{status.label}</StatusPill>
                                            ) : (
                                                <span>{itemsLabel(inv.items.length)}</span>
                                            )}
                                        </div>
                                        {isInvoice && showPaidLine(inv) && (
                                            <p className="mt-1.5 text-xs tabular-nums text-muted-foreground">
                                                المدفوع: <bdi>{formatMoney(inv.amountPaid, inv.currency, "latin")}</bdi>
                                            </p>
                                        )}
                                    </div>
                                    <RowActions invoice={inv} documentType={documentType} creating={creating} actions={actions} />
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            <PaymentDialog invoice={paying} open={paying !== null} onClose={() => setPaying(null)} onUpdated={onChanged} />

            {/* Preview */}
            <Dialog open={preview !== null} onOpenChange={(next) => !next && setPreview(null)}>
                <DialogContent dir="rtl" className="max-w-3xl max-h-[92vh] overflow-y-auto">
                    <DialogHeader className="pe-8 sm:text-start">
                        <DialogTitle>
                            معاينة {label} {preview ? <span dir="ltr">#{preview.docNumber}</span> : null}
                        </DialogTitle>
                        {preview && (
                            <DialogDescription>
                                <bdi>{preview.clientName || "—"}</bdi> · <span dir="ltr">{formatDocDate(preview.issueDate)}</span>
                            </DialogDescription>
                        )}
                    </DialogHeader>
                    {preview ? (
                        <>
                            <ScaledPreview>
                                <InvoiceDocument data={preview} settings={settings} paymentStatus={preview.paymentStatus} />
                            </ScaledPreview>
                            <DialogFooter className="gap-2 sm:justify-start">
                                <Button onClick={() => openPrint(preview)}>
                                    <Printer className="h-4 w-4" /> طباعة / تحميل PDF
                                </Button>
                                <Button variant="outline" onClick={() => setPreview(null)}>
                                    إغلاق
                                </Button>
                            </DialogFooter>
                        </>
                    ) : null}
                </DialogContent>
            </Dialog>

            {/* Delete confirmation */}
            <Dialog open={deleting !== null} onOpenChange={(next) => !next && !removing && setDeleting(null)}>
                <DialogContent dir="rtl" className="sm:max-w-md">
                    <DialogHeader className="pe-8 sm:text-start">
                        <DialogTitle>
                            حذف {label} {deleting ? <span dir="ltr">#{deleting.docNumber}</span> : null}؟
                        </DialogTitle>
                        <DialogDescription>سيُحذف المستند نهائياً، ولا يمكن التراجع عن هذا الإجراء.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:justify-start">
                        <Button variant="destructive" onClick={() => deleting && remove(deleting)} disabled={removing}>
                            {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            حذف
                        </Button>
                        <Button variant="outline" onClick={() => setDeleting(null)} disabled={removing}>
                            إلغاء
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
