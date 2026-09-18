"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight, Check, Download, Loader2, Lock, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { InlineNotice, SectionCard, SegmentedTabs } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import {
    CURRENCIES,
    DOC_LABELS_EN,
    TEMPLATES,
    TEMPLATE_LABELS_EN,
    calcTotals,
    currencyLabelEn,
    docFileName,
    emptyInvoice,
    formatAmount,
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

const STEPS: { title: string; description: string }[] = [
    { title: "Document details", description: "Start with the basics: type, client and project." },
    { title: "Services", description: "Add the services with a description and a price." },
    { title: "Review", description: "Check the details and apply a discount if needed." },
];

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

    // Enter in the price or quantity field adds the service, like a form submit.
    function commitOnEnter(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key !== "Enter") return;
        e.preventDefault();
        commitItem();
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
                if (body.code === "SETUP_REQUIRED") toast.error("The database is not set up yet.");
                else if (body.code === "DUPLICATE_NUMBER")
                    toast.error(
                        `Another ${DOC_LABELS_EN[data.documentType].toLowerCase()} already uses number ${data.docNumber}; the document type cannot be changed.`
                    );
                else if (res.status === 400) {
                    const field = Array.isArray(body.issues) ? body.issues[0]?.path?.[0] : undefined;
                    toast.error(field ? `Invalid value in field: ${String(field)}` : "The document data is invalid.");
                } else toast.error("Could not save the document.");
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
                    toast.error("Saved, but the PDF could not be generated.");
                }
            }

            toast.success(`${DOC_LABELS_EN[saved.documentType]} #${saved.docNumber} saved`);
            onSaved(saved);
        } catch {
            toast.error("Could not reach the server.");
        } finally {
            setBusy(null);
        }
    }

    const current = STEPS[step - 1];

    return (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {/* ---------- Wizard ---------- */}
            <div className="flex min-w-0 flex-col gap-6">
                {editing ? (
                    <InlineNotice
                        tone="sky"
                        icon={Pencil}
                        title={
                            <>
                                Editing {DOC_LABELS_EN[editing.documentType]} #{editing.docNumber}
                            </>
                        }
                        action={
                            <Button variant="ghost" size="sm" onClick={onCancelEdit} className="gap-1.5">
                                <X className="h-4 w-4" /> Cancel editing
                            </Button>
                        }
                    />
                ) : null}

                {/* Stepper */}
                <nav aria-label="Progress">
                    <ol className="flex items-center gap-2 sm:gap-3">
                        {STEPS.map((s, index) => {
                            const number = index + 1;
                            const isCurrent = step === number;
                            const isDone = step > number;
                            return (
                                <li key={s.title} className={cn("flex items-center gap-2 sm:gap-3", index < STEPS.length - 1 && "flex-1")}>
                                    <button
                                        type="button"
                                        aria-current={isCurrent ? "step" : undefined}
                                        onClick={() => (number < step || stepOneValid) && setStep(number)}
                                        className="flex items-center gap-2 rounded-md text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    >
                                        <span
                                            className={cn(
                                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                                                isDone && "border-transparent bg-[#78B7D0] text-[#021526]",
                                                isCurrent && "border-[#021526] text-[#021526] dark:border-[#78B7D0] dark:text-[#78B7D0]",
                                                !isDone && !isCurrent && "text-muted-foreground"
                                            )}
                                        >
                                            {isDone ? <Check className="h-3.5 w-3.5" /> : number}
                                        </span>
                                        {/* Only the current step's label is shown where the stepper is narrow: on phones,
                                            and at lg where the form shares the row with the live preview. */}
                                        <span
                                            className={cn(
                                                "whitespace-nowrap text-sm",
                                                isCurrent ? "font-medium" : "hidden text-muted-foreground sm:inline lg:hidden xl:inline"
                                            )}
                                        >
                                            {s.title}
                                        </span>
                                    </button>
                                    {index < STEPS.length - 1 ? <span aria-hidden="true" className="h-px flex-1 bg-border" /> : null}
                                </li>
                            );
                        })}
                    </ol>
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
                        <div
                            className="h-full rounded-full bg-[#78B7D0] transition-all duration-300"
                            style={{ width: `${(step / STEPS.length) * 100}%` }}
                        />
                    </div>
                </nav>

                <SectionCard title={current.title} description={current.description}>
                    <div key={step} className="space-y-6 p-5 animate-in fade-in-0 duration-200">
                        {step === 1 && (
                            <>
                                <div className="space-y-2">
                                    <Label>Document type</Label>
                                    <SegmentedTabs<DocumentType>
                                        variant="radio"
                                        aria-label="Document type"
                                        value={data.documentType}
                                        onChange={(v) => update("documentType", v)}
                                        options={[
                                            { value: "quotation", label: "Quotation" },
                                            { value: "invoice", label: "Invoice" },
                                        ]}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label id="docNumberLabel">Document number</Label>
                                            <div
                                                role="status"
                                                aria-labelledby="docNumberLabel"
                                                className="flex h-9 items-center justify-between rounded-md border border-dashed bg-muted/50 px-3 text-sm"
                                            >
                                                <span className="font-semibold tabular-nums">{data.docNumber}</span>
                                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Lock className="h-3 w-3" /> Assigned automatically
                                                </span>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="issueDate">Issue date</Label>
                                            <Input id="issueDate" type="date" aria-invalid={!dateValid} value={data.issueDate} onChange={(e) => update("issueDate", e.target.value)} />
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {editing
                                            ? "The number is fixed once the document is saved."
                                            : "Numbers are assigned in sequence when you save and appear on the document and in the list."}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="clientName">Client</Label>
                                    <Input
                                        id="clientName"
                                        dir="auto"
                                        placeholder="Organization or person"
                                        value={data.clientName}
                                        onChange={(e) => update("clientName", e.target.value)}
                                        autoFocus
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="projectName">Project</Label>
                                    <Input
                                        id="projectName"
                                        dir="auto"
                                        placeholder="e.g. حفل تكريم الطلبة المتفوقين"
                                        value={data.projectName}
                                        onChange={(e) => update("projectName", e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="category">Service heading (optional)</Label>
                                    <Input
                                        id="category"
                                        dir="auto"
                                        list="invoice-categories"
                                        placeholder="e.g. الإنتاج المسرحي"
                                        value={data.category}
                                        onChange={(e) => update("category", e.target.value)}
                                    />
                                    <datalist id="invoice-categories">
                                        {categories.map((c) => (
                                            <option key={c} value={c} />
                                        ))}
                                    </datalist>
                                </div>

                                <div className="space-y-2">
                                    <Label>Template</Label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {TEMPLATES.map((t) => {
                                            const meta = TEMPLATE_LABELS_EN[t.key];
                                            const selected = data.template === t.key;
                                            return (
                                                <button
                                                    key={t.key}
                                                    type="button"
                                                    aria-label={`${meta.label} template`}
                                                    aria-pressed={selected}
                                                    onClick={() => update("template", t.key)}
                                                    className={cn(
                                                        "rounded-lg border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                                                        selected ? "border-[#78B7D0] ring-2 ring-[#78B7D0]/40 bg-[#78B7D0]/10" : "hover:bg-muted/60"
                                                    )}
                                                >
                                                    <div
                                                        className="mb-2 h-10 rounded bg-cover bg-top"
                                                        style={
                                                            t.key === "navy"
                                                                ? { background: "radial-gradient(circle at 78% -10%, #0c3047, #021526 62%)" }
                                                                : { backgroundImage: `url(/invoice/hero-${t.key}.jpg)` }
                                                        }
                                                    />
                                                    <div className="text-sm font-medium">{meta.label}</div>
                                                    <div className="text-[11px] leading-snug text-muted-foreground">{meta.hint}</div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <div className="space-y-4 rounded-lg border bg-muted/40 p-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="itemDescription">Description</Label>
                                        <Textarea
                                            id="itemDescription"
                                            rows={4}
                                            dir="auto"
                                            placeholder={"e.g.\nحضور وتقديم الحفل\nيوم الأربعاء 23 سبتمبر الساعة 8 م"}
                                            value={draft.description}
                                            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                                        />
                                        <p className="text-xs text-muted-foreground">Each new line becomes its own line on the document.</p>
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="itemPrice">Price ({data.currency})</Label>
                                            <Input
                                                id="itemPrice"
                                                type="number"
                                                min={0}
                                                step="any"
                                                placeholder="0"
                                                value={draft.price}
                                                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                                                onKeyDown={commitOnEnter}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="itemQty">Quantity</Label>
                                            <Input
                                                id="itemQty"
                                                type="number"
                                                min={0}
                                                step="any"
                                                value={draft.quantity}
                                                onChange={(e) => setDraft({ ...draft, quantity: e.target.value })}
                                                onKeyDown={commitOnEnter}
                                            />
                                        </div>
                                    </div>
                                    <Button onClick={commitItem} className="w-full gap-2" disabled={!draftValid}>
                                        {editingItemId ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                        {editingItemId ? "Update service" : "Add service"}
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Services added ({data.items.length})</p>
                                    <div className="space-y-2">
                                        {data.items.map((item) => (
                                            <div
                                                key={item.id}
                                                className={cn(
                                                    "flex items-start justify-between gap-3 rounded-lg border bg-card p-3",
                                                    editingItemId === item.id && "border-[#78B7D0]"
                                                )}
                                            >
                                                <div className="min-w-0">
                                                    <p dir="auto" className="whitespace-pre-line break-words text-left font-medium">
                                                        {item.description}
                                                    </p>
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        {item.quantity} × {formatAmount(item.price, data.currency)}
                                                    </p>
                                                </div>
                                                <div className="flex shrink-0">
                                                    <Button variant="ghost" size="icon" onClick={() => editItem(item)} title="Edit" aria-label="Edit service">
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeItem(item.id)}
                                                        className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                                                        title="Remove"
                                                        aria-label="Remove service"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                        {data.items.length === 0 ? (
                                            <p className="py-4 text-center text-sm text-muted-foreground">No services added yet.</p>
                                        ) : null}
                                    </div>
                                </div>
                            </>
                        )}

                        {step === 3 && (
                            <>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="currency">Currency</Label>
                                        <Select value={data.currency} onValueChange={(v) => update("currency", v)}>
                                            <SelectTrigger id="currency">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {CURRENCIES.map((c) => (
                                                    <SelectItem key={c.code} value={c.code}>
                                                        {c.code} — {currencyLabelEn(c.code)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label>Discount</Label>
                                    <SegmentedTabs<"percentage" | "amount">
                                        variant="radio"
                                        aria-label="Discount mode"
                                        value={discountMode}
                                        onChange={(mode) => {
                                            setDiscountMode(mode);
                                            if (mode === "amount") setTargetAmount(String(totals.total));
                                        }}
                                        options={[
                                            { value: "percentage", label: "Percentage" },
                                            { value: "amount", label: "Final amount" },
                                        ]}
                                    />
                                    <div className="flex flex-wrap items-center gap-3">
                                        {discountMode === "percentage" ? (
                                            <>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    step="any"
                                                    aria-label="Discount percentage"
                                                    className="max-w-[140px]"
                                                    value={data.discount || ""}
                                                    placeholder="0"
                                                    onChange={(e) => update("discount", Math.max(0, Math.min(100, Number(e.target.value))))}
                                                />
                                                <span className="text-sm text-muted-foreground">Enter a percentage from 0 to 100</span>
                                            </>
                                        ) : (
                                            <>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    step="any"
                                                    aria-label="Final amount"
                                                    className="max-w-[140px]"
                                                    value={targetAmount}
                                                    onChange={(e) => setTargetAmount(e.target.value)}
                                                />
                                                <span className="text-sm text-muted-foreground">
                                                    Amount after discount (subtotal: {formatAmount(totals.subtotal, data.currency)})
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="notes">Notes</Label>
                                    <Textarea
                                        id="notes"
                                        rows={3}
                                        dir="auto"
                                        placeholder="Notes or extra terms shown on the document…"
                                        value={data.notes}
                                        onChange={(e) => update("notes", e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2 rounded-lg border bg-muted/40 p-4">
                                    <SummaryRow label="Subtotal" value={formatAmount(totals.subtotal, data.currency)} />
                                    <SummaryRow
                                        label={`Discount (${Number(data.discount.toFixed(2))}%)`}
                                        value={`- ${formatAmount(totals.discountAmount, data.currency)}`}
                                        muted
                                    />
                                    <div className="flex justify-between border-t pt-2 text-base font-semibold">
                                        <span>Total</span>
                                        <span className="tabular-nums">{formatAmount(totals.total, data.currency)}</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 px-5 py-4">
                        <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 1} className="gap-2">
                            <ArrowLeft className="h-4 w-4" /> Back
                        </Button>

                        {step < 3 ? (
                            <Button
                                onClick={() => setStep((s) => s + 1)}
                                disabled={(step === 1 && !stepOneValid) || (step === 2 && data.items.length === 0)}
                                className="gap-2"
                            >
                                Next <ArrowRight className="h-4 w-4" />
                            </Button>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" onClick={() => save(false)} disabled={!canSave || busy !== null} className="gap-2">
                                    {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    Save
                                </Button>
                                <Button onClick={() => save(true)} disabled={!canSave || busy !== null} className="gap-2">
                                    {busy === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                    Save &amp; download PDF
                                </Button>
                            </div>
                        )}
                    </div>
                </SectionCard>
            </div>

            {/* ---------- Live preview ---------- */}
            <div className="min-w-0 lg:sticky lg:top-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Live preview</p>
                <div className="rounded-xl border bg-muted/30 p-3 sm:p-5">
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

function SummaryRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
    return (
        <div className={cn("flex justify-between text-sm", muted && "text-muted-foreground")}>
            <span>{label}</span>
            <span className="tabular-nums">{value}</span>
        </div>
    );
}
