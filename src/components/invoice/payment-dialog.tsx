"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SegmentedTabs, type SegmentedOption } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { calcTotals, formatAmount, round3, type SavedInvoice } from "@/lib/invoice-types";

interface PaymentDialogProps {
    invoice: SavedInvoice | null;
    open: boolean;
    onClose: () => void;
    onUpdated: (invoice: SavedInvoice) => void;
}

type PaymentMode = "add" | "set";

const MODE_OPTIONS: SegmentedOption<PaymentMode>[] = [
    { value: "add", label: "Add payment" },
    { value: "set", label: "Set total paid" },
];

export function PaymentDialog({ invoice, open, onClose, onUpdated }: PaymentDialogProps) {
    const [mode, setMode] = useState<PaymentMode>("add");
    const [amount, setAmount] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setAmount("");
            setMode("add");
        }
    }, [open, invoice?.id]);

    if (!invoice) return null;

    const { total } = calcTotals(invoice.items, invoice.discount);
    const paid = invoice.amountPaid || 0;
    const remaining = round3(total - paid);
    const money = (value: number) => formatAmount(value, invoice.currency);

    // What the paid amount would become with the current input, so the note
    // under the field can warn about an overpayment before Save is pressed.
    const typed = amount === "" ? NaN : Number(amount);
    const projectedPaid = Number.isFinite(typed) && typed >= 0 ? round3(mode === "add" ? paid + typed : typed) : null;
    const overBy = projectedPaid !== null && projectedPaid > round3(total) ? round3(projectedPaid - total) : 0;

    async function submit() {
        if (!invoice) return;
        const value = Number(amount);
        if (amount === "" || Number.isNaN(value) || value < 0 || (mode === "add" && value === 0)) {
            toast.error("Enter a valid amount.");
            return;
        }
        // Overpaying is allowed: the inline note has already pointed it out.
        const newPaid = round3(mode === "add" ? paid + value : value);

        setSaving(true);
        try {
            const res = await fetch("/api/admin/invoices", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: invoice.id, amountPaid: newPaid }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok || !body.invoice) {
                toast.error("Could not record the payment.");
                return;
            }
            toast.success("Payment saved");
            onUpdated(body.invoice as SavedInvoice);
            onClose();
        } catch {
            toast.error("Could not reach the server.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Record payment</DialogTitle>
                    <DialogDescription>
                        Invoice #{invoice.docNumber} · <bdi>{invoice.clientName || "—"}</bdi>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-3 gap-3 py-2">
                    <Stat label="Total" value={money(total)} />
                    <Stat label="Paid" value={money(paid)} />
                    <Stat label={remaining < 0 ? "Overpaid" : "Remaining"} value={money(Math.abs(remaining))} highlight />
                </div>

                <SegmentedTabs
                    aria-label="Payment mode"
                    value={mode}
                    options={MODE_OPTIONS}
                    onChange={(key) => {
                        setMode(key);
                        setAmount(key === "set" ? String(paid) : "");
                    }}
                />

                <div className="space-y-2">
                    <Label htmlFor="paymentAmount">{mode === "add" ? "Payment amount" : "Total paid"}</Label>
                    <div className="flex gap-2">
                        <Input
                            id="paymentAmount"
                            type="number"
                            min={0}
                            step="any"
                            inputMode="decimal"
                            placeholder="0"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && submit()}
                            autoFocus
                        />
                        {mode === "add" && remaining > 0 ? (
                            <Button type="button" variant="outline" className="shrink-0" onClick={() => setAmount(String(remaining))}>
                                Pay remaining
                            </Button>
                        ) : null}
                    </div>
                    {overBy > 0 && (
                        <p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>This exceeds the invoice total by {money(overBy)}.</span>
                        </p>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:justify-end">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={submit} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className={cn("rounded-lg border p-3", highlight && "border-[#78B7D0]/50 bg-[#78B7D0]/10")}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
        </div>
    );
}
