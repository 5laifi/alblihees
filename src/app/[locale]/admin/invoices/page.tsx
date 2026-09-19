"use client";

import { useCallback, useEffect, useState } from "react";
import {
    AlertCircle,
    Banknote,
    Clock,
    Database,
    FilePlus2,
    FileText,
    HardDrive,
    Loader2,
    ReceiptText,
    Settings2,
    UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InlineNotice, PageHeader, SegmentedTabs, StatTile, StatusPill } from "@/components/admin/ui";
import { InvoiceList } from "@/components/invoice/invoice-list";
import { InvoiceSettingsForm } from "@/components/invoice/invoice-settings-form";
import { InvoiceWizard } from "@/components/invoice/invoice-wizard";
import {
    DEFAULT_INVOICE_SETTINGS,
    DOC_LABELS_PLURAL,
    PAYMENT_STATUS_META_AR,
    formatMoney,
    summarizeDocuments,
    type InvoiceSettings,
    type SavedInvoice,
} from "@/lib/invoice-types";

type TabKey = "create" | "invoices" | "quotations" | "settings";

const CODE_CLASS = "rounded bg-muted px-1 py-0.5 text-xs";

// Arabic count phrase with Latin digits, following the CLDR plural forms for
// Arabic: one, two, few (3-10), many (11-99) and other. The dual keeps the
// accusative form ("مستندين") because every caller places it after a verb.
function countDocuments(count: number): string {
    if (count === 1) return "مستند واحد";
    if (count === 2) return "مستندين";
    const rest = count % 100;
    if (rest >= 3 && rest <= 10) return `${count} مستندات`;
    if (rest >= 11) return `${count} مستنداً`;
    return `${count} مستند`;
}

export default function AdminInvoicesPage() {
    const [tab, setTab] = useState<TabKey>("create");
    const [invoices, setInvoices] = useState<SavedInvoice[]>([]);
    const [settings, setSettings] = useState<InvoiceSettings>(DEFAULT_INVOICE_SETTINGS);
    const [nextNumber, setNextNumber] = useState(1);
    const [storage, setStorage] = useState<"supabase" | "local" | null>(null);
    const [setupRequired, setSetupRequired] = useState(false);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<SavedInvoice | null>(null);
    // Development only: data left in the local preview file that can be moved to the database.
    const [localPreview, setLocalPreview] = useState<{ documents: number; hasSettings: boolean } | null>(null);
    const [importing, setImporting] = useState(false);

    const load = useCallback(async () => {
        try {
            const [listRes, settingsRes] = await Promise.all([fetch("/api/admin/invoices"), fetch("/api/admin/invoices/settings")]);
            const list = await listRes.json().catch(() => ({}));
            const conf = await settingsRes.json().catch(() => ({}));

            if (list.code === "SETUP_REQUIRED" || conf.code === "SETUP_REQUIRED") {
                setSetupRequired(true);
                return;
            }
            if (!listRes.ok || !settingsRes.ok) throw new Error();

            setSetupRequired(false);
            setInvoices(Array.isArray(list.invoices) ? list.invoices : []);
            setNextNumber(list.nextNumber || 1);
            setStorage(list.storage || null);
            if (conf.settings) setSettings(conf.settings);

            // The preview file only exists in development; the route answers 404 in production.
            if (list.storage === "supabase" && process.env.NODE_ENV !== "production") {
                const preview = await fetch("/api/admin/invoices/import-local")
                    .then((res) => (res.ok ? res.json() : null))
                    .catch(() => null);
                setLocalPreview(preview?.preview ?? null);
            } else {
                setLocalPreview(null);
            }
        } catch {
            toast.error("تعذر تحميل البيانات");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    async function importPreview(documents: boolean) {
        setImporting(true);
        try {
            const res = await fetch("/api/admin/invoices/import-local", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ documents }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok || !body.result) {
                toast.error("تعذر نقل بيانات المعاينة");
                return;
            }
            const { settings: movedSettings, imported, skipped } = body.result;
            const parts = [movedSettings ? "تم نقل الإعدادات" : "الإعدادات موجودة مسبقاً في قاعدة البيانات"];
            if (documents) {
                parts.push(imported > 0 ? `تم نقل ${countDocuments(imported)}` : "لم يُنقل أي مستند");
                if (skipped) parts.push(`تم تخطي ${countDocuments(skipped)} بسبب التكرار`);
            }
            toast.success(parts.join(" · "));
            await load();
        } catch {
            toast.error("تعذر الاتصال بالخادم");
        } finally {
            setImporting(false);
        }
    }

    function startNew() {
        setEditing(null);
        setTab("create");
    }

    const count = (type: SavedInvoice["documentType"]) => invoices.filter((inv) => inv.documentType === type).length;
    const summary = summarizeDocuments(invoices);
    const awaiting = summary.unpaid + summary.partial;
    const hasOutstanding = Object.values(summary.outstanding).some((amount) => amount > 0);

    // Outstanding amount per currency, KWD first, Latin digits: "1,215.5 د.ك + 500 $".
    const outstandingEntries = Object.entries(summary.outstanding).filter(([, amount]) => Number.isFinite(amount));
    outstandingEntries.sort(([a], [b]) => (a === "KWD" ? -1 : b === "KWD" ? 1 : a.localeCompare(b)));
    const outstandingText =
        outstandingEntries.length > 0
            ? outstandingEntries.map(([code, amount]) => formatMoney(amount, code, "latin")).join(" + ")
            : formatMoney(0, "KWD", "latin");

    const previewParts: string[] = [];
    if (localPreview?.hasSettings) previewParts.push("الإعدادات");
    if (localPreview && localPreview.documents > 0) previewParts.push(countDocuments(localPreview.documents));

    return (
        <div dir="rtl" lang="ar" className="space-y-6">
            <PageHeader
                title="الفواتير وعروض الأسعار"
                description="أنشئ مستنداتك بهوية ضاري البليهيس واحفظها وتابع حالة الدفع."
                actions={
                    <>
                        {storage === "supabase" && (
                            <StatusPill tone="green">
                                <Database className="h-3 w-3" /> متصل بقاعدة البيانات
                            </StatusPill>
                        )}
                        {storage === "local" && (
                            <StatusPill tone="amber">
                                <HardDrive className="h-3 w-3" /> وضع المعاينة: الحفظ على هذا الجهاز فقط
                            </StatusPill>
                        )}
                        <Button onClick={startNew} className="gap-2">
                            <FilePlus2 className="h-4 w-4" /> مستند جديد
                        </Button>
                    </>
                }
            />

            {setupRequired && (
                <InlineNotice tone="red" icon={AlertCircle} title="قاعدة البيانات غير مهيأة بعد">
                    شغّل ملف <code dir="ltr" className={CODE_CLASS}>supabase-invoices.sql</code> في محرر SQL داخل Supabase، ثم أضف المفتاح{" "}
                    <code dir="ltr" className={CODE_CLASS}>SUPABASE_SERVICE_ROLE_KEY</code> إلى متغيرات البيئة وأعد النشر.
                </InlineNotice>
            )}

            {storage === "local" && (
                <InlineNotice tone="amber" icon={HardDrive} title="وضع المعاينة">
                    لم يتم ضبط المفتاح <code dir="ltr" className={CODE_CLASS}>SUPABASE_SERVICE_ROLE_KEY</code> بعد، فيتم الحفظ في ملف على هذا الجهاز.
                    أضف المفتاح إلى ملف <code dir="ltr" className={CODE_CLASS}>.env.local</code> وإلى متغيرات Vercel ثم أعد تشغيل الخادم، وسيتحول
                    الحفظ تلقائياً إلى قاعدة البيانات.
                </InlineNotice>
            )}

            {localPreview && (
                <InlineNotice
                    tone="sky"
                    icon={UploadCloud}
                    title="بيانات المعاينة جاهزة للنقل إلى قاعدة البيانات"
                    action={
                        <>
                            <Button size="sm" onClick={() => importPreview(false)} disabled={importing} className="gap-2">
                                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                                نقل الإعدادات فقط
                            </Button>
                            {localPreview.documents > 0 && (
                                <Button size="sm" variant="outline" onClick={() => importPreview(true)} disabled={importing}>
                                    نقل الإعدادات والمستندات
                                </Button>
                            )}
                        </>
                    }
                >
                    {previewParts.length > 0
                        ? `يمكن نقل ${previewParts.join(" و")} من ملف المعاينة المحلي إلى قاعدة البيانات.`
                        : "يمكن نقل ملف المعاينة المحلي إلى قاعدة البيانات."}
                </InlineNotice>
            )}

            {!setupRequired &&
                (loading ? (
                    <div className="space-y-6">
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-24 rounded-xl" />
                            ))}
                        </div>
                        <Skeleton className="h-9 w-full max-w-md rounded-lg" />
                        <Skeleton className="h-64 rounded-xl" />
                    </div>
                ) : (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <StatTile
                                label={DOC_LABELS_PLURAL.quotation}
                                value={summary.quotations}
                                icon={FileText}
                                iconClassName="bg-sky-500/10 text-sky-600 dark:text-sky-400"
                            />
                            <StatTile
                                label={DOC_LABELS_PLURAL.invoice}
                                value={summary.invoices}
                                icon={ReceiptText}
                                iconClassName="bg-violet-500/10 text-violet-600 dark:text-violet-400"
                            />
                            <StatTile
                                label="بانتظار الدفع"
                                value={awaiting}
                                icon={Clock}
                                iconClassName="bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                warn={awaiting > 0}
                                hint={
                                    summary.partial > 0
                                        ? `${summary.partial} ${PAYMENT_STATUS_META_AR.partial.label}`
                                        : summary.unpaid > 0
                                          ? `${summary.unpaid} ${PAYMENT_STATUS_META_AR.unpaid.label}`
                                          : summary.invoices > 0
                                            ? "جميع الفواتير مسددة"
                                            : undefined
                                }
                            />
                            <StatTile
                                label="المبالغ المستحقة"
                                value={outstandingText}
                                valueClassName={outstandingEntries.length > 1 ? "text-base" : undefined}
                                icon={Banknote}
                                iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                warn={hasOutstanding}
                                hint="المتبقي على الفواتير دون سداد"
                            />
                        </div>

                        <SegmentedTabs<TabKey>
                            aria-label="أقسام الفواتير"
                            value={tab}
                            onChange={(key) => {
                                setTab(key);
                                if (key !== "create") setEditing(null);
                            }}
                            options={[
                                { value: "create", label: editing ? "تعديل المستند" : "إنشاء جديد", icon: FilePlus2 },
                                { value: "quotations", label: DOC_LABELS_PLURAL.quotation, icon: FileText, count: count("quotation") },
                                { value: "invoices", label: DOC_LABELS_PLURAL.invoice, icon: ReceiptText, count: count("invoice") },
                                { value: "settings", label: "الإعدادات", icon: Settings2 },
                            ]}
                        />

                        {tab === "create" ? (
                            <InvoiceWizard
                                editing={editing}
                                settings={settings}
                                nextNumber={nextNumber}
                                onCancelEdit={() => setEditing(null)}
                                onSaved={(saved) => {
                                    setEditing(null);
                                    setTab(saved.documentType === "invoice" ? "invoices" : "quotations");
                                    load();
                                }}
                            />
                        ) : tab === "settings" ? (
                            <InvoiceSettingsForm settings={settings} onSaved={setSettings} />
                        ) : (
                            <InvoiceList
                                documentType={tab === "invoices" ? "invoice" : "quotation"}
                                invoices={invoices}
                                settings={settings}
                                onChanged={load}
                                onEdit={(inv) => {
                                    setEditing(inv);
                                    setTab("create");
                                }}
                            />
                        )}
                    </>
                ))}
        </div>
    );
}
