"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calcTotals, formatMoney, round3, type SavedInvoice } from "@/lib/invoice-types";

interface PaymentDialogProps {
    invoice: SavedInvoice | null;
    open: boolean;
    onClose: () => void;
    onUpdated: (invoice: SavedInvoice) => void;
}

export function PaymentDialog({ invoice, open, onClose, onUpdated }: PaymentDialogProps) {
    const [mode, setMode] = useState<"add" | "set">("add");
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
    const money = (value: number) => formatMoney(value, invoice.currency, "latin");

    async function submit() {
        if (!invoice) return;
        const value = Number(amount);
        if (amount === "" || Number.isNaN(value) || value < 0 || (mode === "add" && value === 0)) {
            toast.error("أدخل مبلغاً صحيحاً");
            return;
        }
        const newPaid = round3(mode === "add" ? paid + value : value);
        if (newPaid > round3(total) && !confirm(`المبلغ المدفوع سيتجاوز إجمالي الفاتورة بمقدار ${money(round3(newPaid - total))}. هل تريد المتابعة؟`)) {
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/admin/invoices", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: invoice.id, amountPaid: newPaid }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok || !body.invoice) {
                toast.error("تعذر تسجيل الدفعة");
                return;
            }
            toast.success("تم تحديث حالة الدفع");
            onUpdated(body.invoice as SavedInvoice);
            onClose();
        } catch {
            toast.error("تعذر الاتصال بالخادم");
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent dir="rtl" className="sm:max-w-md">
                <DialogHeader className="text-right sm:text-right pr-8">
                    <DialogTitle>تسجيل دفعة</DialogTitle>
                    <DialogDescription>
                        فاتورة رقم <span dir="ltr">{invoice.docNumber}</span> — <bdi>{invoice.clientName}</bdi>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-3 gap-3 py-2 text-center">
                    <Stat label="الإجمالي" value={money(total)} />
                    <Stat label="المدفوع" value={money(paid)} />
                    <Stat label={remaining < 0 ? "زيادة" : "المتبقي"} value={money(Math.abs(remaining))} highlight />
                </div>

                <div className="flex items-center p-1 bg-secondary rounded-lg w-fit text-sm">
                    {(
                        [
                            ["add", "إضافة دفعة"],
                            ["set", "تعديل إجمالي المدفوع"],
                        ] as const
                    ).map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => {
                                setMode(key);
                                setAmount(key === "set" ? String(paid) : "");
                            }}
                            className={`px-3 py-1.5 rounded-md font-medium transition-all ${mode === key ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="paymentAmount">{mode === "add" ? "مبلغ الدفعة" : "إجمالي المدفوع"}</Label>
                    <div className="flex gap-2">
                        <Input
                            id="paymentAmount"
                            type="number"
                            min={0}
                            step="any"
                            dir="ltr"
                            className="text-right"
                            placeholder="0"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && submit()}
                            autoFocus
                        />
                        {mode === "add" && remaining > 0 ? (
                            <Button type="button" variant="outline" onClick={() => setAmount(String(remaining))}>
                                كامل المتبقي
                            </Button>
                        ) : null}
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:justify-start">
                    <Button onClick={submit} disabled={saving} className="gap-2 bg-[#021526] hover:bg-[#0c3047] text-white dark:bg-[#78B7D0] dark:hover:bg-[#9ccbe0] dark:text-[#021526]">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        حفظ
                    </Button>
                    <Button variant="outline" onClick={onClose}>
                        إلغاء
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className={`rounded-lg border p-3 ${highlight ? "border-[#78B7D0]/50 bg-[#78B7D0]/10" : ""}`}>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="font-bold mt-1 text-sm">{value}</div>
        </div>
    );
}
