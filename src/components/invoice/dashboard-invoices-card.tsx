"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { EmptyState, SectionCard, StatusPill } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, ReceiptText } from "lucide-react";
import {
    DOC_LABELS_EN,
    PAYMENT_STATUS_META,
    calcTotals,
    formatAmount,
    formatAmountMap,
    formatDateEn,
    summarizeDocuments,
    type DocumentSummary,
} from "@/lib/invoice-types";

// Invoices & quotations summary for the admin dashboard. It loads on its own so
// a missing invoices setup never affects the rest of the dashboard.

export function DashboardInvoicesCard({ className, refreshKey = 0 }: { className?: string; refreshKey?: number }) {
    const [summary, setSummary] = useState<DocumentSummary | null>(null);
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
                setSummary(summarizeDocuments(body.invoices));
                setState("ready");
            } catch {
                if (!cancelled) setState("error");
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [refreshKey]);

    const awaiting = summary ? summary.unpaid + summary.partial : 0;
    const hasOutstanding = summary ? Object.values(summary.outstanding).some((amount) => amount > 0) : false;

    const stats = summary
        ? [
              { label: "Outstanding", value: formatAmountMap(summary.outstanding), warn: hasOutstanding },
              { label: "Awaiting payment", value: String(awaiting), warn: awaiting > 0 },
              { label: "Quotations", value: String(summary.quotations), warn: false },
          ]
        : [];

    return (
        <SectionCard
            title="Invoices & quotations"
            description="Documents, payments and what is still owed"
            action={
                <Button asChild variant="ghost" size="sm" className="-mr-2 gap-1 text-xs">
                    <Link href="/admin/invoices">
                        View all <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </Button>
            }
            className={className}
        >
            {state === "loading" && (
                <ul className="divide-y">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <li key={i} className="flex items-center gap-4 px-5 py-3.5">
                            <Skeleton className="h-3.5 w-24" />
                            <Skeleton className="h-3 w-1/3" />
                            <Skeleton className="ml-auto h-3 w-16" />
                        </li>
                    ))}
                </ul>
            )}

            {state === "setup" && (
                <p className="px-5 py-6 text-sm text-amber-600 dark:text-amber-400">
                    Invoice storage is not configured yet. Run supabase-invoices.sql and set SUPABASE_SERVICE_ROLE_KEY.
                </p>
            )}

            {state === "error" && <p className="px-5 py-6 text-sm text-red-600 dark:text-red-400">Could not load invoices.</p>}

            {state === "ready" && summary && summary.recent.length === 0 && (
                <EmptyState
                    icon={ReceiptText}
                    title="No documents yet"
                    description="Quotations and invoices you create will appear here."
                    action={
                        <Button asChild variant="outline" size="sm">
                            <Link href="/admin/invoices">Create the first one</Link>
                        </Button>
                    }
                />
            )}

            {state === "ready" && summary && summary.recent.length > 0 && (
                <>
                    <div className="grid grid-cols-3 divide-x border-b">
                        {stats.map((stat) => (
                            <div key={stat.label} className="min-w-0 px-5 py-3">
                                <p className="text-xs text-muted-foreground">{stat.label}</p>
                                <p
                                    className={cn(
                                        "mt-0.5 truncate text-lg font-semibold tabular-nums",
                                        stat.warn && "text-amber-600 dark:text-amber-400"
                                    )}
                                >
                                    {stat.value}
                                </p>
                            </div>
                        ))}
                    </div>

                    <ul className="divide-y">
                        {summary.recent.map((doc) => (
                            <li key={doc.id}>
                                <Link
                                    href="/admin/invoices"
                                    className="flex items-center gap-4 px-5 py-3 text-sm transition-colors hover:bg-muted/40"
                                >
                                    <span className="whitespace-nowrap font-medium tabular-nums">
                                        {DOC_LABELS_EN[doc.documentType]} #{doc.docNumber}
                                    </span>
                                    <bdi className="truncate text-muted-foreground">{doc.clientName}</bdi>
                                    <span className="ml-auto flex shrink-0 items-center gap-3 whitespace-nowrap">
                                        {doc.documentType === "invoice" && (
                                            <StatusPill tone={PAYMENT_STATUS_META[doc.paymentStatus].tone}>
                                                {PAYMENT_STATUS_META[doc.paymentStatus].label}
                                            </StatusPill>
                                        )}
                                        <span className="text-xs text-muted-foreground">{formatDateEn(doc.issueDate)}</span>
                                        <span className="font-medium tabular-nums">
                                            {formatAmount(calcTotals(doc.items, doc.discount).total, doc.currency)}
                                        </span>
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </SectionCard>
    );
}
