"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Download, Loader2, Lock, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
    CURRENCIES,
    DOC_LABELS,
    TEMPLATES,
    calcTotals,
    currencySymbol,
    docFileName,
    emptyInvoice,
    formatMoney,
    newItemId,
    statusForPayment,
    type DocumentType,
    type InvoiceData,
    type InvoiceItem,
    type InvoiceSettings,
    type SavedInvoice,
} from "@/lib/invoice-types";
import { exportNodeToPdf } from "@/lib/invoice-export";
import { InvoiceDocument } from "./invoice-document";
import { ScaledPreview } from "./scaled-preview";

interface InvoiceWizardProps {
    editing: SavedInvoice | null;
    settings: InvoiceSettings;
    nextNumber: number;
    onSaved: (invoice: SavedInvoice) => void;
    onCancelEdit: () => void;
}

const STEPS = ["بيانات المستند", "الخدمات", "المراجعة"];

type ItemDraft = { description: string; price: string; quantity: string };
const EMPTY_DRAFT: ItemDraft = { description: "", price: "", quantity: "1" };

export function InvoiceWizard({ editing, settings, nextNumber, onSaved, onCancelEdit }: InvoiceWizardProps) {
    const [step, setStep] = useState(1);
    const [data, setData] = useState<InvoiceData>(() =>
        emptyInvoice({ docNumber: nextNumber, template: settings.defaultTemplate })
    );
    const [draft, setDraft] = useState<ItemDraft>(EMPTY_DRAFT);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [discountMode, setDiscountMode] = useState<"percentage" | "amount">("percentage");
    const [targetAmount, setTargetAmount] = useState("");
    const [busy, setBusy] = useState<"save" | "pdf" | null>(null);
    const [categories, setCategories] = useState<string[]>([]);
    const docRef = useRef<HTMLDivElement>(null);

    // Load the document being edited, or reset to a fresh one.
    useEffect(() => {
        if (editing) {
            const { documentType, docNumber, issueDate, category, projectName, clientName, items, discount, currency, notes, template } = editing;
            setData({ documentType, docNumber, issueDate, category, projectName, clientName, items, discount, currency, notes, template });
        } else {
            setData(emptyInvoice({ docNumber: nextNumber, template: settings.defaultTemplate }));
        }
        setStep(1);
        setDraft(EMPTY_DRAFT);
        setEditingItemId(null);
        setDiscountMode("percentage");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editing]);

    // The number is assigned by the server and cannot be typed. For a new
    // document the preview shows the number it is about to receive.
    useEffect(() => {
        if (!editing) setData((prev) => (prev.docNumber === nextNumber ? prev : { ...prev, docNumber: nextNumber }));
    }, [nextNumber, editing]);

    // Service names from the website become suggestions for the heading.
    useEffect(() => {
        fetch("/api/admin/services")
            .then((res) => (res.ok ? res.json() : []))
            .then((rows) => {
                if (Array.isArray(rows)) setCategories(rows.map((r) => r.title_ar).filter(Boolean));
            })
            .catch(() => undefined);
    }, []);

    const totals = useMemo(() => calcTotals(data.items, data.discount), [data.items, data.discount]);
    const symbol = currencySymbol(data.currency);

    function update<K extends keyof InvoiceData>(field: K, value: InvoiceData[K]) {
        setData((prev) => ({ ...prev, [field]: value }));
    }

    const draftValid = draft.description.trim() !== "" && Number(draft.price) > 0 && Number(draft.quantity) > 0;

    function commitItem() {
        if (!draftValid) return;
        const item: InvoiceItem = {
            id: editingItemId || newItemId(),
            description: draft.description.trim(),
            price: Number(draft.price),
            quantity: Number(draft.quantity),
        };
        setData((prev) => ({
            ...prev,
            items: editingItemId ? prev.items.map((i) => (i.id === editingItemId ? item : i)) : [...prev.items, item],
        }));
        setDraft(EMPTY_DRAFT);
        setEditingItemId(null);
    }

    function editItem(item: InvoiceItem) {
        setEditingItemId(item.id);
        setDraft({ description: item.description, price: String(item.price), quantity: String(item.quantity) });
    }

    function removeItem(id: string) {
        setData((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== id) }));
        if (editingItemId === id) {
            setEditingItemId(null);
            setDraft(EMPTY_DRAFT);
        }
    }

    // In "final amount" mode the typed target is the source of truth: the
    // percentage is re-derived whenever the target or the services change, and
    // kept at high precision so the printed total hits the target to the fils.
    useEffect(() => {
        if (discountMode !== "amount" || targetAmount === "" || totals.subtotal <= 0) return;
        const pct = ((totals.subtotal - Number(targetAmount)) / totals.subtotal) * 100;
        const next = Math.round(Math.max(0, Math.min(100, pct)) * 1e10) / 1e10;
        setData((prev) => (prev.discount === next ? prev : { ...prev, discount: next }));
    }, [totals.subtotal, discountMode, targetAmount]);

    const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(data.issueDate);
    const stepOneValid = data.clientName.trim() !== "" && data.projectName.trim() !== "" && dateValid;
    const canSave = stepOneValid && data.items.length > 0;

    async function save(withPdf: boolean) {
        if (!canSave || busy) return;
        setBusy(withPdf ? "pdf" : "save");
        try {
            // docNumber is deliberately not sent: the server owns the numbering.
            const { docNumber: _assignedByServer, ...payload } = data;
            void _assignedByServer;
            const res = await fetch("/api/admin/invoices", {
                method: editing ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editing ? { id: editing.id, ...payload } : payload),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok || !body.invoice) {
                if (body.code === "SETUP_REQUIRED") toast.error("قاعدة البيانات غير مهيأة بعد");
                else if (body.code === "DUPLICATE_NUMBER") toast.error(`يوجد ${DOC_LABELS[data.documentType]} آخر بالرقم ${data.docNumber}، لا يمكن تغيير نوع هذا المستند`);
                else if (res.status === 400) {
                    const field = Array.isArray(body.issues) ? body.issues[0]?.path?.[0] : undefined;
                    toast.error(field ? `بيانات غير صالحة في الحقل: ${String(field)}` : "بيانات المستند غير صالحة");
                } else toast.error("تعذر حفظ المستند");
                return;
            }

            const saved = body.invoice as SavedInvoice;

            // If someone else saved a document a moment earlier, the server gave
            // this one the following number. Show it before capturing the PDF.
            if (saved.docNumber !== data.docNumber) {
                setData((prev) => ({ ...prev, docNumber: saved.docNumber }));
                await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
            }

            if (withPdf && docRef.current) {
                try {
                    await exportNodeToPdf(docRef.current, docFileName(saved));
                } catch (error) {
                    console.error("PDF export failed:", error);
                    toast.error("تم الحفظ، لكن تعذر إنشاء ملف PDF");
                }
            }

            toast.success(`تم حفظ ${DOC_LABELS[saved.documentType]} رقم ${saved.docNumber}`);
            onSaved(saved);
        } catch {
            toast.error("تعذر الاتصال بالخادم");
        } finally {
            setBusy(null);
        }
    }

    return (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start">
            {/* ---------- Wizard ---------- */}
            <div className="flex flex-col min-w-0">
                {editing ? (
                    <div className="mb-4 flex items-center justify-between rounded-lg border border-[#78B7D0]/40 bg-[#78B7D0]/10 px-4 py-2.5 text-sm">
                        <span>
                            تعديل {DOC_LABELS[editing.documentType]} رقم <b dir="ltr">{editing.docNumber}</b>
                        </span>
                        <Button variant="ghost" size="sm" onClick={onCancelEdit} className="gap-1">
                            <X className="h-4 w-4" /> إلغاء التعديل
                        </Button>
                    </div>
                ) : null}

                <div className="mb-6">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                        {STEPS.map((label, index) => (
                            <span key={label} className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => (index + 1 < step || stepOneValid) && setStep(index + 1)}
                                    className={cn("transition-colors", step >= index + 1 && "text-primary font-bold")}
                                >
                                    {label}
                                </button>
                                {index < STEPS.length - 1 ? <ArrowLeft className="h-4 w-4" /> : null}
                            </span>
                        ))}
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-[#78B7D0]"
                            initial={false}
                            animate={{ width: `${(step / STEPS.length) * 100}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                </div>

                <Card className="overflow-hidden">
                    <CardContent className="p-6">
                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                    <StepTitle title="بيانات المستند" subtitle="نبدأ بالأساسيات: النوع، العميل، والمشروع." />

                                    <div className="space-y-2">
                                        <Label>نوع المستند</Label>
                                        <Segmented<DocumentType>
                                            value={data.documentType}
                                            onChange={(v) => update("documentType", v)}
                                            options={[
                                                { value: "quotation", label: "عرض سعر" },
                                                { value: "invoice", label: "فاتورة" },
                                            ]}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label id="docNumberLabel">رقم المستند</Label>
                                            <div
                                                role="status"
                                                aria-labelledby="docNumberLabel"
                                                className="flex h-9 items-center justify-between rounded-md border border-dashed bg-muted/50 px-3 text-sm"
                                            >
                                                <span dir="ltr" className="font-bold tabular-nums">
                                                    {data.docNumber}
                                                </span>
                                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Lock className="h-3 w-3" /> تلقائي
                                                </span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="issueDate">التاريخ</Label>
                                            <Input id="issueDate" type="date" dir="ltr" className="text-right" aria-invalid={!dateValid} value={data.issueDate} onChange={(e) => update("issueDate", e.target.value)} />
                                        </div>
                                    </div>

                                    <p className="-mt-3 text-xs text-muted-foreground">
                                        {editing
                                            ? "رقم المستند ثابت ولا يمكن تغييره بعد الحفظ."
                                            : "يُعطى الرقم تلقائياً بالتسلسل عند الحفظ، ويظهر نفسه في المستند وفي القائمة."}
                                    </p>

                                    <div className="space-y-2">
                                        <Label htmlFor="clientName">من هو العميل؟</Label>
                                        <Input id="clientName" placeholder="اسم الجهة أو الشخص" value={data.clientName} onChange={(e) => update("clientName", e.target.value)} autoFocus />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="projectName">ما اسم المشروع؟</Label>
                                        <Input id="projectName" placeholder="مثال: حفل تكريم الطلبة المتفوقين" value={data.projectName} onChange={(e) => update("projectName", e.target.value)} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="category">عنوان الخدمة (اختياري)</Label>
                                        <Input id="category" list="invoice-categories" placeholder="مثال: الإنتاج المسرحي" value={data.category} onChange={(e) => update("category", e.target.value)} />
                                        <datalist id="invoice-categories">
                                            {categories.map((c) => (
                                                <option key={c} value={c} />
                                            ))}
                                        </datalist>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>القالب</Label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {TEMPLATES.map((t) => (
                                                <button
                                                    key={t.key}
                                                    type="button"
                                                    aria-label={`قالب ${t.label}`}
                                                    aria-pressed={data.template === t.key}
                                                    onClick={() => update("template", t.key)}
                                                    className={cn(
                                                        "rounded-lg border p-3 text-right transition-all",
                                                        data.template === t.key ? "border-[#78B7D0] ring-2 ring-[#78B7D0]/40 bg-[#78B7D0]/10" : "hover:bg-muted/60"
                                                    )}
                                                >
                                                    <div
                                                        className="h-10 rounded mb-2 bg-cover bg-top"
                                                        style={
                                                            t.key === "navy"
                                                                ? { background: "radial-gradient(circle at 78% -10%, #0c3047, #021526 62%)" }
                                                                : { backgroundImage: `url(/invoice/hero-${t.key}.jpg)` }
                                                        }
                                                    />
                                                    <div className="text-sm font-bold">{t.label}</div>
                                                    <div className="text-[11px] text-muted-foreground leading-snug">{t.hint}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {step === 2 && (
                                <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                    <StepTitle title="الخدمات" subtitle="أضف الخدمات المطلوبة ووصف كل منها وتكلفتها." />

                                    <div className="space-y-4 p-4 bg-secondary/40 rounded-lg border">
                                        <div className="space-y-2">
                                            <Label htmlFor="itemDescription">الوصف</Label>
                                            <Textarea
                                                id="itemDescription"
                                                rows={4}
                                                placeholder={"مثال:\nحضور وتقديم الحفل\nيوم الأربعاء 23 سبتمبر الساعة 8 م"}
                                                value={draft.description}
                                                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                                            />
                                            <p className="text-xs text-muted-foreground">كل سطر جديد يظهر كسطر مستقل في المستند.</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="itemPrice">السعر ({symbol})</Label>
                                                <Input
                                                    id="itemPrice"
                                                    type="number"
                                                    min={0}
                                                    step="any"
                                                    dir="ltr"
                                                    className="text-right"
                                                    placeholder="0"
                                                    value={draft.price}
                                                    onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                                                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), commitItem())}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="itemQty">الكمية</Label>
                                                <Input
                                                    id="itemQty"
                                                    type="number"
                                                    min={0}
                                                    step="any"
                                                    dir="ltr"
                                                    className="text-right"
                                                    value={draft.quantity}
                                                    onChange={(e) => setDraft({ ...draft, quantity: e.target.value })}
                                                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), commitItem())}
                                                />
                                            </div>
                                        </div>
                                        <Button onClick={commitItem} className="w-full gap-2" disabled={!draftValid}>
                                            {editingItemId ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                            {editingItemId ? "تحديث الخدمة" : "إضافة الخدمة"}
                                        </Button>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>الخدمات المضافة ({data.items.length})</Label>
                                        <div className="space-y-2">
                                            {data.items.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className={cn(
                                                        "flex items-start justify-between gap-3 p-3 bg-card border rounded-lg shadow-sm",
                                                        editingItemId === item.id && "border-[#78B7D0]"
                                                    )}
                                                >
                                                    <div className="min-w-0">
                                                        <p className="font-medium whitespace-pre-line break-words">{item.description}</p>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            {item.quantity} × {formatMoney(item.price, data.currency, "latin")}
                                                        </p>
                                                    </div>
                                                    <div className="flex shrink-0">
                                                        <Button variant="ghost" size="icon" onClick={() => editItem(item)} title="تعديل">
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" title="حذف">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                            {data.items.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">لم تتم إضافة أي خدمة بعد.</p> : null}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {step === 3 && (
                                <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                    <StepTitle title="المراجعة النهائية" subtitle="راجع التفاصيل وطبّق الخصم إن وجد." />

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="currency">العملة</Label>
                                            <select
                                                id="currency"
                                                value={data.currency}
                                                onChange={(e) => update("currency", e.target.value)}
                                                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                            >
                                                {CURRENCIES.map((c) => (
                                                    <option key={c.code} value={c.code}>
                                                        {c.label} ({c.symbol})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <Label>الخصم</Label>
                                        <Segmented<"percentage" | "amount">
                                            value={discountMode}
                                            onChange={(mode) => {
                                                setDiscountMode(mode);
                                                if (mode === "amount") setTargetAmount(String(totals.total));
                                            }}
                                            options={[
                                                { value: "percentage", label: "نسبة مئوية (٪)" },
                                                { value: "amount", label: "المبلغ النهائي" },
                                            ]}
                                        />
                                        <div className="flex items-center gap-3">
                                            {discountMode === "percentage" ? (
                                                <>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        max={100}
                                                        step="any"
                                                        dir="ltr"
                                                        className="max-w-[140px] text-right"
                                                        value={data.discount || ""}
                                                        placeholder="0"
                                                        onChange={(e) => update("discount", Math.max(0, Math.min(100, Number(e.target.value))))}
                                                    />
                                                    <span className="text-muted-foreground text-sm">أدخل النسبة من 0 إلى 100</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Input type="number" min={0} step="any" dir="ltr" className="max-w-[140px] text-right" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
                                                    <span className="text-muted-foreground text-sm">
                                                        المبلغ بعد الخصم (المجموع: {formatMoney(totals.subtotal, data.currency, "latin")})
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="notes">ملاحظات</Label>
                                        <Textarea id="notes" rows={3} placeholder="أي ملاحظات أو شروط إضافية تظهر في المستند..." value={data.notes} onChange={(e) => update("notes", e.target.value)} />
                                    </div>

                                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 space-y-2">
                                        <SummaryRow label="المجموع" value={formatMoney(totals.subtotal, data.currency, "latin")} />
                                        <SummaryRow
                                            label={`الخصم (${Number(data.discount.toFixed(2))}٪)`}
                                            value={`- ${formatMoney(totals.discountAmount, data.currency, "latin")}`}
                                            muted
                                        />
                                        <div className="flex justify-between font-bold text-lg pt-2 border-t border-primary/10 text-primary">
                                            <span>الإجمالي</span>
                                            <span>{formatMoney(totals.total, data.currency, "latin")}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </CardContent>

                    <div className="p-4 sm:p-6 border-t bg-muted/20 flex flex-wrap gap-3 justify-between">
                        <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 1} className="gap-2">
                            <ArrowRight className="h-4 w-4" /> السابق
                        </Button>

                        {step < 3 ? (
                            <Button onClick={() => setStep((s) => s + 1)} disabled={(step === 1 && !stepOneValid) || (step === 2 && data.items.length === 0)} className="gap-2">
                                التالي <ArrowLeft className="h-4 w-4" />
                            </Button>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" onClick={() => save(false)} disabled={!canSave || busy !== null} className="gap-2">
                                    {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    حفظ
                                </Button>
                                <Button onClick={() => save(true)} disabled={!canSave || busy !== null} className="gap-2 bg-[#021526] hover:bg-[#0c3047] text-white dark:bg-[#78B7D0] dark:hover:bg-[#9ccbe0] dark:text-[#021526]">
                                    {busy === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                    حفظ وتحميل PDF
                                </Button>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* ---------- Live preview ---------- */}
            <div className="min-w-0 lg:sticky lg:top-4">
                <div className="mb-2 text-sm font-medium text-muted-foreground">معاينة مباشرة</div>
                <div className="rounded-xl bg-muted/40 p-3 sm:p-5">
                    <ScaledPreview>
                        <InvoiceDocument
                            ref={docRef}
                            data={data}
                            settings={settings}
                            paymentStatus={editing ? statusForPayment(editing.amountPaid, totals.total) : undefined}
                        />
                    </ScaledPreview>
                </div>
            </div>
        </div>
    );
}

function StepTitle({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <div className="space-y-1">
            <h2 className="text-2xl font-bold text-primary">{title}</h2>
            <p className="text-muted-foreground">{subtitle}</p>
        </div>
    );
}

function SummaryRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
    return (
        <div className={cn("flex justify-between text-sm", muted && "text-muted-foreground")}>
            <span>{label}</span>
            <span>{value}</span>
        </div>
    );
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (value: T) => void; options: { value: T; label: string }[] }) {
    return (
        <div className="flex items-center p-1 bg-secondary rounded-lg w-fit">
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange(option.value)}
                    className={cn(
                        "px-4 py-2 text-sm font-medium rounded-md transition-all",
                        value === option.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
