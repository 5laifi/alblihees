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
import {
    TEMPLATES,
    TEMPLATE_LABELS_EN,
    emptyInvoice,
    type InvoiceSettings,
    type InvoiceTemplate,
    type Numerals,
} from "@/lib/invoice-types";
import { InvoiceDocument } from "./invoice-document";
import { ScaledPreview } from "./scaled-preview";

interface Props {
    settings: InvoiceSettings;
    onSaved: (settings: InvoiceSettings) => void;
}

// The sample stays Arabic on purpose: the printed document is always Arabic,
// only the admin chrome around it is English.
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
                toast.error("Could not save the settings, check the fields.");
                return;
            }
            toast.success("Settings saved");
            onSaved(body.settings as InvoiceSettings);
        } catch {
            toast.error("Could not reach the server.");
        } finally {
            setSaving(false);
        }
    }

    // Free-text fields may hold Arabic, so they get dir="auto"; codes, URLs
    // and numbers stay in the console's own direction.
    const text = (
        key: keyof InvoiceSettings,
        label: string,
        options: { auto?: boolean; placeholder?: string; className?: string } = {}
    ) => (
        <div className={cn("space-y-2", options.className)}>
            <Label htmlFor={`set-${key}`}>{label}</Label>
            <Input
                id={`set-${key}`}
                dir={options.auto ? "auto" : undefined}
                placeholder={options.placeholder}
                value={String(form[key] ?? "")}
                onChange={(e) => set(key, e.target.value as never)}
            />
        </div>
    );

    return (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
            <div className="min-w-0 space-y-6">
                <SectionCard title="Contact details" description="Shown at the bottom of every document." contentClassName={FIELD_GRID}>
                    {text("phone", "Phone", { placeholder: "+965…" })}
                    {text("email", "Email")}
                    {text("website", "Website")}
                    {text("businessNameEn", "English name (watermark)")}
                    {text("tagline", "Tagline", { auto: true, className: "sm:col-span-2" })}
                </SectionCard>

                <SectionCard
                    title="Payment details"
                    description="Printed on invoices only, never on quotations. An empty field goes back to the built-in value."
                    contentClassName={FIELD_GRID}
                >
                    <div className="flex items-center gap-3 sm:col-span-2">
                        <Switch
                            id="set-showPaymentDetails"
                            checked={form.showPaymentDetails}
                            onCheckedChange={(v) => set("showPaymentDetails", v)}
                        />
                        <Label htmlFor="set-showPaymentDetails">Show payment details on invoices</Label>
                    </div>
                    {text("payeeName", "Cheque payee name", { auto: true, className: "sm:col-span-2" })}
                    {text("iban", "IBAN", { className: "sm:col-span-2" })}
                    {text("accountNumber", "Account number")}
                    {text("accountName", "Account name (English)")}
                    <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="set-invoiceTerms">Payment text on invoices</Label>
                        <Textarea
                            id="set-invoiceTerms"
                            rows={2}
                            dir="auto"
                            value={form.invoiceTerms}
                            onChange={(e) => set("invoiceTerms", e.target.value)}
                        />
                    </div>
                </SectionCard>

                <SectionCard title="Liaison officer & signature" contentClassName={FIELD_GRID}>
                    {text("liaisonTitle", "Title", { auto: true })}
                    {text("liaisonName", "Name", { auto: true })}
                    {text("liaisonPhone", "Phone")}
                    {text("signatureUrl", "Signature image URL")}
                    <div className="flex items-center gap-3 sm:col-span-2">
                        <Switch id="set-showSignature" checked={form.showSignature} onCheckedChange={(v) => set("showSignature", v)} />
                        <Label htmlFor="set-showSignature">Show signature on documents</Label>
                    </div>
                </SectionCard>

                <SectionCard title="Document options" contentClassName={FIELD_GRID}>
                    {text("qrUrl", "QR code link (leave empty to hide)", { className: "sm:col-span-2" })}
                    <div className="space-y-2">
                        <Label htmlFor="set-defaultTemplate">Default template</Label>
                        <Select value={form.defaultTemplate} onValueChange={(v) => set("defaultTemplate", v as InvoiceTemplate)}>
                            <SelectTrigger id="set-defaultTemplate">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {TEMPLATES.map((t) => (
                                    <SelectItem key={t.key} value={t.key}>
                                        {TEMPLATE_LABELS_EN[t.key].label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="set-numerals">Numerals on amounts</Label>
                        <Select value={form.numerals} onValueChange={(v) => set("numerals", v as Numerals)}>
                            <SelectTrigger id="set-numerals">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="arabic">Arabic numerals (٥٠٠)</SelectItem>
                                <SelectItem value="latin">Latin numerals (500)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="set-startNumber">Numbering starts at</Label>
                        <Input
                            id="set-startNumber"
                            type="number"
                            min={1}
                            value={form.startNumber || ""}
                            onChange={(e) => set("startNumber", Math.max(1, Math.floor(Number(e.target.value)) || 1))}
                        />
                        <p className="text-xs text-muted-foreground">
                            The next number is the larger of this value and the last saved number + 1. Numbers cannot be typed on the document.
                        </p>
                    </div>
                </SectionCard>

                <div className="flex justify-end">
                    <Button onClick={save} disabled={saving} className="gap-2">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save settings
                    </Button>
                </div>
            </div>

            <div className="min-w-0 lg:sticky lg:top-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Preview with current settings</p>
                <div className="rounded-xl border bg-muted/30 p-3 sm:p-5">
                    <ScaledPreview>
                        <InvoiceDocument data={{ ...SAMPLE, template: form.defaultTemplate }} settings={form} />
                    </ScaledPreview>
                </div>
            </div>
        </div>
    );
}
