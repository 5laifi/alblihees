"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, ReceiptText } from "lucide-react";
import { calcTotals, formatDocDate, formatMoney, round3, type SavedInvoice } from "@/lib/invoice-types";

// Invoices & quotations summary for the admin dashboard. It loads on its own so
// a missing invoices setup never affects the rest of the dashboard.

interface InvoiceSummary {
    quotations: number;
    invoices: number;
    unpaid: number;
    /** Outstanding amount per currency, e.g. { KWD: 1200.5 } */
    outstanding: Record<string, number>;
    recent: SavedInvoice[];
}

const PAYMENT_PILL: Record<SavedInvoice["paymentStatus"], { label: string; className: string }> = {
    unpaid: { label: "Unpaid", className: "bg-red-500/10 text-red-600 dark:text-red-400" },
    partial: { label: "Partial", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    paid: { label: "Paid", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
};

function summarize(list: SavedInvoice[]): InvoiceSummary {
    const invoices = list.filter((doc) => doc.documentType === "invoice");
    const outstanding: Record<string, number> = {};
    for (const inv of invoices) {
        const remaining = round3(calcTotals(inv.items, inv.discount).total - (inv.amountPaid || 0));
        if (remaining > 0) outstanding[inv.currency] = round3((outstanding[inv.currency] || 0) + remaining);
    }
    return {
        quotations: list.length - invoices.length,
        invoices: invoices.length,
        unpaid: invoices.filter((inv) => inv.paymentStatus !== "paid").length,
        outstanding,
        recent: list.slice(0, 5),
    };
}

export function DashboardInvoicesCard({ className, refreshKey = 0 }: { className?: string; refreshKey?: number }) {
    const [summary, setSummary] = useState<InvoiceSummary | null>(null);
    const [state, setState] = useState<"loading" | "ready" | "setup" | "error">("loading");

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/admin/invoices");
                const body = await res.json().catch(() => ({}));
                if (cancelled) return;
                if (body.code === "SETUP_REQUIRED") return setState("setup");
                if (!res.ok || !Array.isArray(body.invoices)) return setState("error");
                setSummary(summarize(body.invoices));
                setState("ready");
            } catch {
                if (!cancelled) setState("error");
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [refreshKey]);

    const outstandingText =
        summary && Object.keys(summary.outstanding).length > 0
            ? Object.entries(summary.outstanding)
                  .map(([currency, amount]) => formatMoney(amount, currency, "latin"))
                  .join(" + ")
            : "0";

    const tiles = summary
        ? [
              { label: "Quotations", value: String(summary.quotations), warn: false },
              { label: "Invoices", value: String(summary.invoices), warn: false },
              { label: "Awaiting payment", value: String(summary.unpaid), warn: summary.unpaid > 0 },
              { label: "Outstanding", value: outstandingText, warn: outstandingText !== "0" },
          ]
        : [];

    return (
        <section className={cn("flex flex-col rounded-xl border bg-card text-card-foreground shadow-sm", className)}>
            <header className="flex items-start justify-between gap-4 border-b px-5 py-4">
                <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#78B7D0]/10 text-[#78B7D0]">
                        <ReceiptText className="h-4 w-4" />
                    </span>
                    <div>
                        <h2 className="text-sm font-semibold">Invoices &amp; quotations</h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">Documents, payments and what is still owed</p>
                    </div>
                </div>
                <Link
                    href="/admin/invoices"
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                    Open <ArrowRight className="h-3 w-3" />
                </Link>
            </header>

            <div className="flex-1 p-5">
                {state === "loading" && (
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="rounded-lg border p-4">
                                <Skeleton className="h-3 w-20" />
                                <Skeleton className="mt-2 h-6 w-12" />
                            </div>
                        ))}
                    </div>
                )}

                {state === "setup" && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                        Invoice storage is not configured yet. Run supabase-invoices.sql and set SUPABASE_SERVICE_ROLE_KEY.
                    </p>
                )}

                {state === "error" && <p className="text-sm text-red-600 dark:text-red-400">Could not load invoices.</p>}

                {state === "ready" && summary && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                            {tiles.map((tile) => (
                                <div key={tile.label} className="rounded-lg border p-4">
                                    <p className="text-xs text-muted-foreground">{tile.label}</p>
                                    <p className={cn("mt-1 text-xl font-semibold tabular-nums", tile.warn && "text-amber-600 dark:text-amber-400")}>
                                        <bdi>{tile.value}</bdi>
                                    </p>
                                </div>
                            ))}
                        </div>

                        {summary.recent.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No documents yet.{" "}
                                <Link href="/admin/invoices" className="font-medium text-foreground underline-offset-4 hover:underline">
                                    Create the first one
                                </Link>
                                .
                            </p>
                        ) : (
                            <div>
                                <p className="mb-2 text-xs font-medium text-muted-foreground">Latest documents</p>
                                <ul className="divide-y rounded-lg border">
                                    {summary.recent.map((doc) => (
                                        <li key={doc.id}>
                                            <Link
                                                href="/admin/invoices"
                                                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm transition-colors hover:bg-muted/60"
                                            >
                                                <span className="flex min-w-0 items-center gap-3">
                                                    <span className="whitespace-nowrap font-medium">
                                                        {doc.documentType === "invoice" ? "Invoice" : "Quotation"} #{doc.docNumber}
                                                    </span>
                                                    <bdi className="truncate text-muted-foreground">{doc.clientName}</bdi>
                                                </span>
                                                <span className="flex items-center gap-3 whitespace-nowrap">
                                                    {doc.documentType === "invoice" && (
                                                        <span
                                                            className={cn(
                                                                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                                                                PAYMENT_PILL[doc.paymentStatus].className
                                                            )}
                                                        >
                                                            {PAYMENT_PILL[doc.paymentStatus].label}
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-muted-foreground" dir="ltr">
                                                        {formatDocDate(doc.issueDate)}
                                                    </span>
                                                    <bdi className="font-semibold tabular-nums">
                                                        {formatMoney(calcTotals(doc.items, doc.discount).total, doc.currency, "latin")}
                                                    </bdi>
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
