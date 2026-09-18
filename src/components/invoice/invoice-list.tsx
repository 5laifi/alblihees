"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Banknote, Copy, Eye, FileOutput, FileText, Loader2, MoreHorizontal, Pencil, Printer, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, StatusPill } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    DOC_LABELS_EN,
    DOC_LABELS_EN_PLURAL,
    PAYMENT_STATUS_META,
    calcTotals,
    formatAmount,
    formatDateEn,
    todayIso,
    type DocumentType,
    type InvoiceSettings,
    type NewInvoiceInput,
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

// A copy never carries the old number: the server gives it the next one.
function toCopyPayload(inv: SavedInvoice): NewInvoiceInput {
    const { documentType, category, projectName, clientName, items, discount, currency, notes, template } = inv;
    return { documentType, issueDate: todayIso(), category, projectName, clientName, items, discount, currency, notes, template };
}

function itemsLabel(count: number): string {
    return `${count} ${count === 1 ? "service" : "services"}`;
}

/** Instalments received so far are shown until the invoice is settled. */
function showPaidLine(inv: SavedInvoice): boolean {
    return inv.amountPaid > 0 && inv.paymentStatus !== "paid";
}

interface RowActionHandlers {
    preview: (inv: SavedInvoice) => void;
    print: (inv: SavedInvoice) => void;
    edit: (inv: SavedInvoice) => void;
    pay: (inv: SavedInvoice) => void;
    convert: (inv: SavedInvoice) => void;
    copy: (inv: SavedInvoice) => void;
    requestDelete: (inv: SavedInvoice) => void;
}

/** The "…" menu on every row. Shared by the table and the stacked mobile rows. */
function RowActions({
    invoice,
    documentType,
    creating,
    actions,
}: {
    invoice: SavedInvoice;
    documentType: DocumentType;
    creating: boolean;
    actions: RowActionHandlers;
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Actions</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onSelect={() => actions.preview(invoice)}>
                    <Eye /> Preview
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => actions.print(invoice)}>
                    <Printer /> Print / PDF
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => actions.edit(invoice)}>
                    <Pencil /> Edit
                </DropdownMenuItem>
                {documentType === "invoice" ? (
                    <DropdownMenuItem onSelect={() => actions.pay(invoice)}>
                        <Banknote /> Record payment
                    </DropdownMenuItem>
                ) : (
                    <DropdownMenuItem disabled={creating} onSelect={() => actions.convert(invoice)}>
                        <FileOutput /> Convert to invoice
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem disabled={creating} onSelect={() => actions.copy(invoice)}>
                    <Copy /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    className="text-red-600 focus:text-red-600 dark:text-red-400"
                    onSelect={() => actions.requestDelete(invoice)}
                >
                    <Trash2 /> Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function InvoiceList({ documentType, invoices, settings, onEdit, onChanged }: InvoiceListProps) {
    const locale = useLocale();
    const [query, setQuery] = useState("");
    const [preview, setPreview] = useState<SavedInvoice | null>(null);
    const [paying, setPaying] = useState<SavedInvoice | null>(null);
    const [creating, setCreating] = useState(false);
    // The document waiting for delete confirmation, and whether its request is in flight.
    const [deleting, setDeleting] = useState<SavedInvoice | null>(null);
    const [removing, setRemoving] = useState(false);

    const label = DOC_LABELS_EN[documentType];
    const plural = DOC_LABELS_EN_PLURAL[documentType];
    const isInvoice = documentType === "invoice";

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
                toast.error(
                    kind === "convert"
                        ? "This quotation was already converted to an invoice."
                        : "Could not assign a new number, please try again."
                );
                return;
            }
            if (!res.ok || !data.invoice) throw new Error();
            toast.success(
                kind === "convert"
                    ? `Invoice #${data.invoice.docNumber} created from the quotation`
                    : `Copy created as #${data.invoice.docNumber}`
            );
            onChanged();
        } catch {
            toast.error("Could not complete the action.");
        } finally {
            setCreating(false);
        }
    }

    // Runs after the user confirms in the delete dialog. On failure the dialog
    // stays open so they can retry or cancel.
    async function remove(inv: SavedInvoice) {
        setRemoving(true);
        try {
            const res = await fetch(`/api/admin/invoices?id=${encodeURIComponent(inv.id)}`, { method: "DELETE" });
            if (!res.ok) throw new Error();
            toast.success("Deleted");
            setDeleting(null);
            onChanged();
        } catch {
            toast.error("Could not delete.");
        } finally {
            setRemoving(false);
        }
    }

    const actions: RowActionHandlers = {
        preview: setPreview,
        print: openPrint,
        edit: onEdit,
        pay: setPaying,
        convert: (inv) => create({ convertFromId: inv.id }, "convert"),
        copy: (inv) => create(toCopyPayload(inv), "copy"),
        requestDelete: setDeleting,
    };

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    dir="auto"
                    placeholder="Search by client, project or number…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-9"
                    aria-label={`Search ${plural.toLowerCase()}`}
                />
            </div>

            {visible.length === 0 ? (
                <div className="rounded-xl border bg-card shadow-sm">
                    <EmptyState
                        icon={FileText}
                        title={`No ${plural.toLowerCase()}`}
                        description={query ? "Try a different search." : "Create the first one from the New document tab."}
                    />
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border bg-card shadow-sm animate-in fade-in-0 duration-200">
                    {/* md and up: table */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40 hover:bg-muted/40">
                                    <TableHead className="w-24 pl-5 pr-4">#</TableHead>
                                    <TableHead className="px-4">Client / project</TableHead>
                                    <TableHead className="w-36 px-4">Date</TableHead>
                                    <TableHead className="w-36 px-4 text-right">Total</TableHead>
                                    <TableHead className="w-44 px-4">{isInvoice ? "Payment" : "Items"}</TableHead>
                                    <TableHead className="w-14 pl-4 pr-5">
                                        <span className="sr-only">Actions</span>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {visible.map((inv) => {
                                    const { total } = calcTotals(inv.items, inv.discount);
                                    const status = PAYMENT_STATUS_META[inv.paymentStatus];
                                    return (
                                        <TableRow key={inv.id}>
                                            <TableCell className="py-3 pl-5 pr-4 font-medium tabular-nums">#{inv.docNumber}</TableCell>
                                            <TableCell className="px-4 py-3">
                                                <div className="max-w-[28rem]">
                                                    <p className="truncate font-medium">
                                                        <bdi>{inv.clientName || "—"}</bdi>
                                                    </p>
                                                    {inv.projectName && (
                                                        <p dir="auto" className="truncate text-left text-xs text-muted-foreground">
                                                            {inv.projectName}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                                                {formatDateEn(inv.issueDate)}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums">
                                                {formatAmount(total, inv.currency)}
                                            </TableCell>
                                            <TableCell className="px-4 py-3">
                                                {isInvoice ? (
                                                    <div className="flex flex-col items-start gap-1">
                                                        <StatusPill tone={status.tone}>{status.label}</StatusPill>
                                                        {showPaidLine(inv) && (
                                                            <span className="text-xs tabular-nums text-muted-foreground">
                                                                Paid {formatAmount(inv.amountPaid, inv.currency)}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">{itemsLabel(inv.items.length)}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-3 pl-4 pr-5 text-right">
                                                <RowActions invoice={inv} documentType={documentType} creating={creating} actions={actions} />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    {/* below md: stacked rows with the same information */}
                    <ul className="md:hidden">
                        {visible.map((inv) => {
                            const { total } = calcTotals(inv.items, inv.discount);
                            const status = PAYMENT_STATUS_META[inv.paymentStatus];
                            return (
                                <li key={inv.id} className="flex items-start justify-between gap-3 border-b p-4 last:border-b-0">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline gap-2">
                                            <span className="shrink-0 text-sm font-medium tabular-nums">#{inv.docNumber}</span>
                                            <p className="min-w-0 truncate text-sm font-medium">
                                                <bdi>{inv.clientName || "—"}</bdi>
                                            </p>
                                        </div>
                                        {inv.projectName && (
                                            <p dir="auto" className="mt-0.5 truncate text-left text-xs text-muted-foreground">
                                                {inv.projectName}
                                            </p>
                                        )}
                                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                                            <span className="whitespace-nowrap">{formatDateEn(inv.issueDate)}</span>
                                            <span className="whitespace-nowrap font-semibold tabular-nums text-foreground">
                                                {formatAmount(total, inv.currency)}
                                            </span>
                                            {isInvoice ? (
                                                <StatusPill tone={status.tone}>{status.label}</StatusPill>
                                            ) : (
                                                <span>{itemsLabel(inv.items.length)}</span>
                                            )}
                                        </div>
                                        {isInvoice && showPaidLine(inv) && (
                                            <p className="mt-1.5 text-xs tabular-nums text-muted-foreground">
                                                Paid {formatAmount(inv.amountPaid, inv.currency)}
                                            </p>
                                        )}
                                    </div>
                                    <RowActions invoice={inv} documentType={documentType} creating={creating} actions={actions} />
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            <PaymentDialog invoice={paying} open={paying !== null} onClose={() => setPaying(null)} onUpdated={onChanged} />

            {/* Preview */}
            <Dialog open={preview !== null} onOpenChange={(next) => !next && setPreview(null)}>
                <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            Preview — {label}
                            {preview ? ` #${preview.docNumber}` : ""}
                        </DialogTitle>
                        {preview && (
                            <DialogDescription>
                                <bdi>{preview.clientName || "—"}</bdi> · {formatDateEn(preview.issueDate)}
                            </DialogDescription>
                        )}
                    </DialogHeader>
                    {preview ? (
                        <>
                            <ScaledPreview>
                                <InvoiceDocument data={preview} settings={settings} paymentStatus={preview.paymentStatus} />
                            </ScaledPreview>
                            <DialogFooter className="gap-2 sm:justify-end">
                                <Button variant="outline" onClick={() => setPreview(null)}>
                                    Close
                                </Button>
                                <Button onClick={() => openPrint(preview)}>
                                    <Printer className="h-4 w-4" /> Print / download PDF
                                </Button>
                            </DialogFooter>
                        </>
                    ) : null}
                </DialogContent>
            </Dialog>

            {/* Delete confirmation */}
            <Dialog open={deleting !== null} onOpenChange={(next) => !next && !removing && setDeleting(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            Delete {label}
                            {deleting ? ` #${deleting.docNumber}` : ""}?
                        </DialogTitle>
                        <DialogDescription>This permanently removes the document. This cannot be undone.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:justify-end">
                        <Button variant="outline" onClick={() => setDeleting(null)} disabled={removing}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={() => deleting && remove(deleting)} disabled={removing}>
                            {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
