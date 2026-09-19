"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { TEMPLATES, emptyInvoice, type InvoiceSettings, type InvoiceTemplate, type Numerals } from "@/lib/invoice-types";
import { InvoiceDocument } from "./invoice-document";
import { ScaledPreview } from "./scaled-preview";

interface Props {
    settings: InvoiceSettings;
    onSaved: (settings: InvoiceSettings) => void;
}

// Sample data for the live preview beside the form.
const SAMPLE = emptyInvoice({
    documentType: "invoice", // so the preview shows the payment details block
    docNumber: 100,
    clientName: "اسم العميل",
    projectName: "اسم المشروع",
    items: [{ id: "sample", description: "وصف الخدمة يظهر هنا\nمع تفاصيل الموعد والمكان", price: 500, quantity: 1 }],
});

const FIELD_GRID = "grid gap-4 p-5 sm:grid-cols-2";

export function InvoiceSettingsForm({ settings, onSaved }: Props) {
    const [form, setForm] = useState<InvoiceSettings>(settings);
    const [saving, setSaving] = useState(false);

    // Keep the form in step with the settings the parent reloads after a save
    useEffect(() => setForm(settings), [settings]);

    function set<K extends keyof InvoiceSettings>(key: K, value: InvoiceSettings[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    async function save() {
        setSaving(true);
        try {
            const res = await fetch("/api/admin/invoices/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok || !body.settings) {
                toast.error("تعذر حفظ الإعدادات، تحقق من الحقول");
                return;
            }
            toast.success("تم حفظ الإعدادات");
            onSaved(body.settings as InvoiceSettings);
        } catch {
            toast.error("تعذر الاتصال بالخادم");
        } finally {
            setSaving(false);
        }
    }

    // Codes, URLs and numbers are Latin-only, so they get dir="ltr" and sit
    // flush with the labels (text-end); free-text fields may hold Arabic or
    // English, so they get dir="auto".
    const text = (
        key: keyof InvoiceSettings,
        label: string,
        options: { dir?: "ltr" | "auto"; placeholder?: string; className?: string } = {}
    ) => (
        <div className={cn("space-y-2", options.className)}>
            <Label htmlFor={`set-${key}`}>{label}</Label>
            <Input
                id={`set-${key}`}
                dir={options.dir}
                className={options.dir === "ltr" ? "text-end" : undefined}
                placeholder={options.placeholder}
                value={String(form[key] ?? "")}
                onChange={(e) => set(key, e.target.value as never)}
            />
        </div>
    );

    return (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
            <div className="min-w-0 space-y-6">
                <SectionCard title="بيانات التواصل" description="تظهر أسفل كل فاتورة وعرض سعر." contentClassName={FIELD_GRID}>
                    {text("phone", "رقم الهاتف", { dir: "ltr", placeholder: "+965…" })}
                    {text("email", "البريد الإلكتروني", { dir: "ltr" })}
                    {text("website", "الموقع الإلكتروني", { dir: "ltr" })}
                    {text("businessNameEn", "الاسم بالإنجليزية (العلامة المائية)", { dir: "ltr" })}
                    {text("tagline", "الشعار النصي", { dir: "auto", className: "sm:col-span-2" })}
                </SectionCard>

                <SectionCard
                    title="بيانات الدفع"
                    description="تُطبع في الفواتير فقط ولا تظهر في عروض الأسعار. الحقل الفارغ يعود إلى القيمة الافتراضية المدمجة."
                    contentClassName={FIELD_GRID}
                >
                    <div className="flex items-center gap-3 sm:col-span-2">
                        {/* The switch thumb slides along a physical axis, so it keeps its own LTR direction */}
                        <Switch
                            id="set-showPaymentDetails"
                            dir="ltr"
                            checked={form.showPaymentDetails}
                            onCheckedChange={(v) => set("showPaymentDetails", v)}
                        />
                        <Label htmlFor="set-showPaymentDetails">إظهار بيانات الدفع في الفواتير</Label>
                    </div>
                    {text("payeeName", "اسم المستفيد في الشيك", { dir: "auto", className: "sm:col-span-2" })}
                    {text("iban", "IBAN", { dir: "ltr", className: "sm:col-span-2" })}
                    {text("accountNumber", "رقم الحساب", { dir: "ltr" })}
                    {text("accountName", "اسم الحساب (بالإنجليزية)", { dir: "ltr" })}
                    <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="set-invoiceTerms">نص الدفع في الفواتير</Label>
                        <Textarea
                            id="set-invoiceTerms"
                            rows={2}
                            dir="auto"
                            value={form.invoiceTerms}
                            onChange={(e) => set("invoiceTerms", e.target.value)}
                        />
                    </div>
                </SectionCard>

                <SectionCard title="ضابط الاتصال والتوقيع" contentClassName={FIELD_GRID}>
                    {text("liaisonTitle", "المسمى", { dir: "auto" })}
                    {text("liaisonName", "الاسم", { dir: "auto" })}
                    {text("liaisonPhone", "الهاتف", { dir: "ltr" })}
                    {text("signatureUrl", "رابط صورة التوقيع", { dir: "ltr" })}
                    <div className="flex items-center gap-3 sm:col-span-2">
                        <Switch id="set-showSignature" dir="ltr" checked={form.showSignature} onCheckedChange={(v) => set("showSignature", v)} />
                        <Label htmlFor="set-showSignature">إظهار التوقيع في المستندات</Label>
                    </div>
                </SectionCard>

                <SectionCard title="خيارات المستند" contentClassName={FIELD_GRID}>
                    {text("qrUrl", "رابط رمز QR (اتركه فارغاً لإخفائه)", { dir: "ltr", className: "sm:col-span-2" })}
                    <div className="space-y-2">
                        <Label htmlFor="set-defaultTemplate">القالب الافتراضي</Label>
                        <Select value={form.defaultTemplate} onValueChange={(v) => set("defaultTemplate", v as InvoiceTemplate)}>
                            <SelectTrigger id="set-defaultTemplate">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {TEMPLATES.map((t) => (
                                    <SelectItem key={t.key} value={t.key}>
                                        {t.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="set-numerals">شكل الأرقام في المبالغ</Label>
                        <Select value={form.numerals} onValueChange={(v) => set("numerals", v as Numerals)}>
                            <SelectTrigger id="set-numerals">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="arabic">أرقام عربية (٥٠٠)</SelectItem>
                                <SelectItem value="latin">أرقام إنجليزية (500)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="set-startNumber">بداية الترقيم التلقائي</Label>
                        <Input
                            id="set-startNumber"
                            type="number"
                            min={1}
                            dir="ltr"
                            className="text-end"
                            value={form.startNumber || ""}
                            onChange={(e) => set("startNumber", Math.max(1, Math.floor(Number(e.target.value)) || 1))}
                        />
                        <p className="text-xs text-muted-foreground">
                            الرقم التالي هو الأكبر بين هذه القيمة وآخر رقم محفوظ مضافاً إليه واحد. لا يمكن كتابة الرقم يدوياً داخل المستند.
                        </p>
                    </div>
                </SectionCard>

                <div className="flex justify-end">
                    <Button onClick={save} disabled={saving} className="gap-2">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        حفظ الإعدادات
                    </Button>
                </div>
            </div>

            <div className="min-w-0 lg:sticky lg:top-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">معاينة بالبيانات الحالية</p>
                <div className="rounded-xl border bg-muted/30 p-3 sm:p-5">
                    <ScaledPreview>
                        <InvoiceDocument data={{ ...SAMPLE, template: form.defaultTemplate }} settings={form} />
                    </ScaledPreview>
                </div>
            </div>
        </div>
    );
}
