"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { motion } from "framer-motion";
import { Banknote, Copy, Eye, FileOutput, FileText, Pencil, Printer, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    DOC_LABELS,
    STATUS_LABELS,
    calcTotals,
    formatDocDate,
    formatMoney,
    todayIso,
    type DocumentType,
    type InvoiceSettings,
    type NewInvoiceInput,
    type PaymentStatus,
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

const STATUS_STYLES: Record<PaymentStatus, string> = {
    unpaid: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    partial: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
};

// A copy never carries the old number: the server gives it the next one.
function toCopyPayload(inv: SavedInvoice): NewInvoiceInput {
    const { documentType, category, projectName, clientName, items, discount, currency, notes, template } = inv;
    return { documentType, issueDate: todayIso(), category, projectName, clientName, items, discount, currency, notes, template };
}

export function InvoiceList({ documentType, invoices, settings, onEdit, onChanged }: InvoiceListProps) {
    const locale = useLocale();
    const [query, setQuery] = useState("");
    const [preview, setPreview] = useState<SavedInvoice | null>(null);
    const [paying, setPaying] = useState<SavedInvoice | null>(null);
    const [creating, setCreating] = useState(false);

    const label = DOC_LABELS[documentType];
    const plural = documentType === "invoice" ? "فواتير" : "عروض أسعار";

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
                toast.error(kind === "convert" ? "تم تحويل عرض السعر هذا إلى فاتورة من قبل" : "تعذر إعطاء رقم جديد، حاول مرة أخرى");
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
            toast.error("تعذر تنفيذ العملية");
        } finally {
            setCreating(false);
        }
    }

    async function remove(inv: SavedInvoice) {
        if (!confirm(`هل أنت متأكد من حذف ${label} رقم ${inv.docNumber}؟`)) return;
        try {
            const res = await fetch(`/api/admin/invoices?id=${encodeURIComponent(inv.id)}`, { method: "DELETE" });
            if (!res.ok) throw new Error();
            toast.success("تم الحذف");
            onChanged();
        } catch {
            toast.error("تعذر الحذف");
        }
    }

    return (
        <div className="space-y-6">
            <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="ابحث باسم العميل أو المشروع أو رقم المستند..." value={query} onChange={(e) => setQuery(e.target.value)} className="pr-10" />
            </div>

            {visible.length === 0 ? (
                <Card className="p-12 text-center">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">لا توجد {plural}</h3>
                    <p className="text-muted-foreground">{query ? "جرّب كلمة بحث مختلفة" : `أنشئ أول ${label} من تبويب «إنشاء جديد»`}</p>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {visible.map((inv, index) => {
                        const { total } = calcTotals(inv.items, inv.discount);
                        return (
                            <motion.div key={inv.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 8) * 0.04 }}>
                                <Card className="p-5 hover:shadow-lg transition-shadow">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#78B7D0]/20 shrink-0">
                                                    <FileText className="h-5 w-5 text-[#021526] dark:text-[#78B7D0]" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-semibold text-lg">
                                                        {label} <span dir="ltr">#{inv.docNumber}</span>
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground truncate"><bdi>{inv.clientName}</bdi></p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <Field label="المشروع" value={inv.projectName} />
                                                <Field label="التاريخ" value={formatDocDate(inv.issueDate)} ltr />
                                                <Field label="الإجمالي" value={formatMoney(total, inv.currency, "latin")} strong />
                                                {documentType === "invoice" ? (
                                                    <div>
                                                        <p className="text-xs text-muted-foreground mb-1">حالة الدفع</p>
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[inv.paymentStatus]}`}>{STATUS_LABELS[inv.paymentStatus]}</span>
                                                        {inv.amountPaid > 0 && inv.paymentStatus !== "paid" ? (
                                                            <p className="text-xs text-muted-foreground mt-1.5">المدفوع: {formatMoney(inv.amountPaid, inv.currency, "latin")}</p>
                                                        ) : null}
                                                    </div>
                                                ) : (
                                                    <Field label="عدد الخدمات" value={String(inv.items.length)} />
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 lg:max-w-[230px] lg:justify-end">
                                            {documentType === "invoice" ? (
                                                <IconButton title="تسجيل دفعة" onClick={() => setPaying(inv)}>
                                                    <Banknote className="h-4 w-4" />
                                                </IconButton>
                                            ) : (
                                                <IconButton
                                                    title="تحويل إلى فاتورة"
                                                    onClick={() => create({ convertFromId: inv.id }, "convert")}
                                                >
                                                    <FileOutput className="h-4 w-4" />
                                                </IconButton>
                                            )}
                                            <IconButton title="معاينة" onClick={() => setPreview(inv)}>
                                                <Eye className="h-4 w-4" />
                                            </IconButton>
                                            <IconButton title="طباعة / PDF" onClick={() => openPrint(inv)}>
                                                <Printer className="h-4 w-4" />
                                            </IconButton>
                                            <IconButton title="تعديل" onClick={() => onEdit(inv)}>
                                                <Pencil className="h-4 w-4" />
                                            </IconButton>
                                            <IconButton
                                                title="نسخ برقم جديد"
                                                onClick={() => create(toCopyPayload(inv), "copy")}
                                            >
                                                <Copy className="h-4 w-4" />
                                            </IconButton>
                                            <IconButton title="حذف" onClick={() => remove(inv)} danger>
                                                <Trash2 className="h-4 w-4" />
                                            </IconButton>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            <PaymentDialog invoice={paying} open={paying !== null} onClose={() => setPaying(null)} onUpdated={onChanged} />

            <Dialog open={preview !== null} onOpenChange={(next) => !next && setPreview(null)}>
                <DialogContent dir="rtl" className="max-w-3xl max-h-[92vh] overflow-y-auto">
                    <DialogHeader className="text-right sm:text-right pr-8">
                        <DialogTitle>
                            معاينة {label} {preview ? <span dir="ltr">#{preview.docNumber}</span> : null}
                        </DialogTitle>
                    </DialogHeader>
                    {preview ? (
                        <>
                            <ScaledPreview>
                                <InvoiceDocument data={preview} settings={settings} paymentStatus={preview.paymentStatus} />
                            </ScaledPreview>
                            <div className="flex justify-start gap-2 mt-4">
                                <Button onClick={() => openPrint(preview)} className="gap-2 bg-[#021526] hover:bg-[#0c3047] text-white dark:bg-[#78B7D0] dark:hover:bg-[#9ccbe0] dark:text-[#021526]">
                                    <Printer className="h-4 w-4" /> طباعة / تحميل PDF
                                </Button>
                                <Button variant="outline" onClick={() => setPreview(null)}>
                                    إغلاق
                                </Button>
                            </div>
                        </>
                    ) : null}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function Field({ label, value, strong, ltr }: { label: string; value: string; strong?: boolean; ltr?: boolean }) {
    return (
        <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className={`truncate ${strong ? "font-bold text-[#021526] dark:text-[#78B7D0]" : "font-medium"}`} dir={ltr ? "ltr" : undefined} style={ltr ? { textAlign: "right" } : undefined}>
                {ltr ? value : <bdi>{value}</bdi>}
            </p>
        </div>
    );
}

function IconButton({ title, onClick, danger, children }: { title: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
    return (
        <Button size="sm" variant="outline" onClick={onClick} title={title} aria-label={title} className={danger ? "text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" : undefined}>
            {children}
        </Button>
    );
}
