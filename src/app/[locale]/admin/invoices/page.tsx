"use client";

import { useCallback, useEffect, useState } from "react";
import { Database, FilePlus2, FileText, HardDrive, Loader2, ReceiptText, Settings2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InvoiceList } from "@/components/invoice/invoice-list";
import { InvoiceSettingsForm } from "@/components/invoice/invoice-settings-form";
import { InvoiceWizard } from "@/components/invoice/invoice-wizard";
import { cn } from "@/lib/utils";
import { DEFAULT_INVOICE_SETTINGS, type InvoiceSettings, type SavedInvoice } from "@/lib/invoice-types";

type TabKey = "create" | "invoices" | "quotations" | "settings";

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

            if (list.storage === "supabase") {
                // Answers 404 in production, where the preview file is never used.
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
            toast.success(
                `تم النقل: ${movedSettings ? "الإعدادات" : "الإعدادات موجودة مسبقاً"}${documents ? `، ${imported} مستند${skipped ? `، وتخطي ${skipped} مكرر` : ""}` : ""}`
            );
            await load();
        } catch {
            toast.error("تعذر الاتصال بالخادم");
        } finally {
            setImporting(false);
        }
    }

    const count = (type: SavedInvoice["documentType"]) => invoices.filter((inv) => inv.documentType === type).length;

    const tabs: { key: TabKey; label: string; icon: typeof FileText; badge?: number }[] = [
        { key: "create", label: editing ? "تعديل المستند" : "إنشاء جديد", icon: FilePlus2 },
        { key: "quotations", label: "عروض الأسعار", icon: FileText, badge: count("quotation") },
        { key: "invoices", label: "الفواتير", icon: ReceiptText, badge: count("invoice") },
        { key: "settings", label: "الإعدادات", icon: Settings2 },
    ];

    return (
        <div dir="rtl" lang="ar" className="text-right">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-primary mb-2">الفواتير وعروض الأسعار</h1>
                    <p className="text-muted-foreground">أنشئ مستنداتك بهوية ضاري البليهيس واحفظها وتابع حالة الدفع.</p>
                </div>
                {storage ? (
                    <span
                        className={cn(
                            "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
                            storage === "local" ? "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200" : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200"
                        )}
                    >
                        {storage === "local" ? <HardDrive className="h-3.5 w-3.5" /> : <Database className="h-3.5 w-3.5" />}
                        {storage === "local" ? "وضع المعاينة: الحفظ على هذا الجهاز فقط" : "متصل بقاعدة البيانات"}
                    </span>
                ) : null}
            </div>

            {storage === "local" ? (
                <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-7 text-amber-900 dark:bg-amber-900/20 dark:text-amber-100">
                    <b>لماذا وضع المعاينة؟</b> لم يتم ضبط المفتاح <code dir="ltr">SUPABASE_SERVICE_ROLE_KEY</code> بعد، فيتم الحفظ في ملف على هذا الجهاز.
                    أضف المفتاح إلى ملف <code dir="ltr">.env.local</code> وإلى متغيرات Vercel ثم أعد تشغيل الخادم، وسيتحول الحفظ تلقائياً إلى قاعدة البيانات.
                </div>
            ) : null}

            {localPreview ? (
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#78B7D0]/50 bg-[#78B7D0]/10 p-4 text-sm">
                    <div className="leading-7">
                        <b>بيانات من وضع المعاينة جاهزة للنقل إلى قاعدة البيانات:</b>{" "}
                        {localPreview.hasSettings ? "الإعدادات" : ""}
                        {localPreview.hasSettings && localPreview.documents > 0 ? " و" : ""}
                        {localPreview.documents > 0 ? `${localPreview.documents} مستند` : ""}.
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => importPreview(false)} disabled={importing} className="gap-2 bg-[#021526] hover:bg-[#0c3047] text-white dark:bg-[#78B7D0] dark:hover:bg-[#9ccbe0] dark:text-[#021526]">
                            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                            نقل الإعدادات فقط
                        </Button>
                        {localPreview.documents > 0 ? (
                            <Button size="sm" variant="outline" onClick={() => importPreview(true)} disabled={importing}>
                                نقل الإعدادات والمستندات
                            </Button>
                        ) : null}
                    </div>
                </div>
            ) : null}

            {setupRequired ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-900 dark:bg-amber-900/20 dark:text-amber-100">
                    <h2 className="font-bold text-lg mb-2">قاعدة البيانات غير مهيأة بعد</h2>
                    <p className="text-sm leading-7">
                        شغّل ملف <code dir="ltr">supabase-invoices.sql</code> في محرر SQL داخل Supabase، ثم أضف المفتاح
                        <code dir="ltr"> SUPABASE_SERVICE_ROLE_KEY </code> إلى متغيرات البيئة وأعد النشر.
                    </p>
                </div>
            ) : loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <>
                    <div className="flex flex-wrap gap-2 mb-6">
                        {tabs.map((t) => (
                            <button
                                key={t.key}
                                type="button"
                                onClick={() => {
                                    setTab(t.key);
                                    if (t.key !== "create") setEditing(null);
                                }}
                                className={cn(
                                    "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
                                    tab === t.key ? "bg-[#021526] text-white shadow-lg dark:bg-[#78B7D0] dark:text-[#021526]" : "bg-card border hover:bg-muted"
                                )}
                            >
                                <t.icon className="h-4 w-4" />
                                {t.label}
                                {t.badge ? (
                                    <span className={cn("rounded-full px-2 text-xs", tab === t.key ? "bg-white/20" : "bg-muted-foreground/15")}>{t.badge}</span>
                                ) : null}
                            </button>
                        ))}
                    </div>

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
            )}
        </div>
    );
}
