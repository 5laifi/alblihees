"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { TEMPLATES, emptyInvoice, type InvoiceSettings } from "@/lib/invoice-types";
import { InvoiceDocument } from "./invoice-document";
import { ScaledPreview } from "./scaled-preview";

interface Props {
    settings: InvoiceSettings;
    onSaved: (settings: InvoiceSettings) => void;
}

const SAMPLE = emptyInvoice({
    docNumber: 100,
    clientName: "اسم العميل",
    projectName: "اسم المشروع",
    items: [{ id: "sample", description: "وصف الخدمة يظهر هنا\nمع تفاصيل الموعد والمكان", price: 500, quantity: 1 }],
});

export function InvoiceSettingsForm({ settings, onSaved }: Props) {
    const [form, setForm] = useState<InvoiceSettings>(settings);
    const [saving, setSaving] = useState(false);

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

    const text = (key: keyof InvoiceSettings, label: string, options: { ltr?: boolean; placeholder?: string } = {}) => (
        <div className="space-y-2">
            <Label htmlFor={`set-${key}`}>{label}</Label>
            <Input
                id={`set-${key}`}
                dir={options.ltr ? "ltr" : undefined}
                className={options.ltr ? "text-right" : undefined}
                placeholder={options.placeholder}
                value={String(form[key] ?? "")}
                onChange={(e) => set(key, e.target.value as never)}
            />
        </div>
    );

    return (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] items-start">
            <div className="space-y-6 min-w-0">
                <Card>
                    <CardHeader>
                        <CardTitle>بيانات التواصل</CardTitle>
                        <CardDescription>تظهر أسفل كل فاتورة وعرض سعر.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                        {text("phone", "رقم الهاتف", { ltr: true, placeholder: "+965..." })}
                        {text("email", "البريد الإلكتروني", { ltr: true })}
                        {text("website", "الموقع الإلكتروني", { ltr: true })}
                        {text("businessNameEn", "الاسم بالإنجليزية (العلامة المائية)", { ltr: true })}
                        <div className="sm:col-span-2">{text("tagline", "الشعار النصي")}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>بيانات الدفع</CardTitle>
                        <CardDescription>تُحفظ في قاعدة البيانات فقط ولا تُكتب داخل الكود. اترك الحقل فارغاً لإخفائه من المستند.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">{text("payeeName", "اسم المستفيد في الشيك")}</div>
                        <div className="sm:col-span-2">{text("iban", "IBAN", { ltr: true })}</div>
                        {text("accountNumber", "رقم الحساب", { ltr: true })}
                        {text("accountName", "اسم الحساب (بالإنجليزية)", { ltr: true })}
                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="set-quotationTerms">نص الدفع في عروض الأسعار</Label>
                            <Textarea id="set-quotationTerms" rows={2} value={form.quotationTerms} onChange={(e) => set("quotationTerms", e.target.value)} />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="set-invoiceTerms">نص الدفع في الفواتير</Label>
                            <Textarea id="set-invoiceTerms" rows={2} value={form.invoiceTerms} onChange={(e) => set("invoiceTerms", e.target.value)} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>ضابط الاتصال والتوقيع</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                        {text("liaisonTitle", "المسمى")}
                        {text("liaisonName", "الاسم")}
                        {text("liaisonPhone", "الهاتف", { ltr: true })}
                        {text("signatureUrl", "رابط صورة التوقيع", { ltr: true })}
                        <div className="flex items-center gap-3 sm:col-span-2">
                            <Switch id="set-showSignature" dir="ltr" checked={form.showSignature} onCheckedChange={(v) => set("showSignature", v)} />
                            <Label htmlFor="set-showSignature">إظهار التوقيع</Label>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>خيارات المستند</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">{text("qrUrl", "رابط رمز QR (اتركه فارغاً لإخفائه)", { ltr: true })}</div>
                        <div className="space-y-2">
                            <Label htmlFor="set-defaultTemplate">القالب الافتراضي</Label>
                            <NativeSelect id="set-defaultTemplate" value={form.defaultTemplate} onChange={(v) => set("defaultTemplate", v as InvoiceSettings["defaultTemplate"])}>
                                {TEMPLATES.map((t) => (
                                    <option key={t.key} value={t.key}>
                                        {t.label}
                                    </option>
                                ))}
                            </NativeSelect>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="set-numerals">شكل الأرقام في المبالغ</Label>
                            <NativeSelect id="set-numerals" value={form.numerals} onChange={(v) => set("numerals", v as InvoiceSettings["numerals"])}>
                                <option value="arabic">أرقام عربية (٥٠٠)</option>
                                <option value="latin">أرقام إنجليزية (500)</option>
                            </NativeSelect>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="set-startNumber">بداية الترقيم التلقائي</Label>
                            <Input
                                id="set-startNumber"
                                type="number"
                                min={1}
                                dir="ltr"
                                className="text-right"
                                value={form.startNumber || ""}
                                onChange={(e) => set("startNumber", Math.max(1, Math.floor(Number(e.target.value)) || 1))}
                            />
                            <p className="text-xs text-muted-foreground">الرقم التالي هو الأكبر بين هذا الرقم وآخر رقم محفوظ + ١. لا يمكن كتابة الرقم يدوياً داخل المستند.</p>
                        </div>
                    </CardContent>
                </Card>

                <Button onClick={save} disabled={saving} className="gap-2 bg-[#021526] hover:bg-[#0c3047] text-white dark:bg-[#78B7D0] dark:hover:bg-[#9ccbe0] dark:text-[#021526]">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    حفظ الإعدادات
                </Button>
            </div>

            <div className="min-w-0 lg:sticky lg:top-4">
                <div className="mb-2 text-sm font-medium text-muted-foreground">معاينة بالبيانات الحالية</div>
                <div className="rounded-xl bg-muted/40 p-3 sm:p-5">
                    <ScaledPreview>
                        <InvoiceDocument data={{ ...SAMPLE, template: form.defaultTemplate }} settings={form} />
                    </ScaledPreview>
                </div>
            </div>
        </div>
    );
}

function NativeSelect({ id, value, onChange, children }: { id: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
    return (
        <select
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
            {children}
        </select>
    );
}
