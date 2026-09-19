"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, SectionCard } from "@/components/admin/ui";
import { DashboardInvoicesCard } from "@/components/invoice/dashboard-invoices-card";
import { ArrowRight, RefreshCw, Inbox, AlertCircle } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface ContactSubmission {
    id: string;
    name: string;
    email: string;
    message: string;
    is_read: boolean;
    created_at: string;
}

interface Messages {
    total: number;
    unread: number;
    recent: ContactSubmission[];
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function timeAgo(dateStr: string) {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function initials(name: string) {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p.charAt(0).toUpperCase())
        .join("");
}

function formatToday() {
    return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
const subscribeNoop = () => () => { };

/** Latest contact form submissions; null when they could not be loaded. */
async function fetchMessages(): Promise<Messages | null> {
    try {
        const res = await fetch("/api/admin/contacts", { cache: "no-store" });
        if (!res.ok) return null;
        const rows: unknown = await res.json();
        if (!Array.isArray(rows)) return null;
        const list = [...(rows as ContactSubmission[])].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        return { total: list.length, unread: list.filter((c) => !c.is_read).length, recent: list.slice(0, 5) };
    } catch {
        return null;
    }
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AdminDashboardPage() {
    const [messages, setMessages] = useState<Messages | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    // Bumped by Refresh so the self-loading invoices card reloads with the messages
    const [invoicesRefreshKey, setInvoicesRefreshKey] = useState(0);

    // Client-only date so the server render never disagrees with the browser's timezone.
    const today = useSyncExternalStore(subscribeNoop, formatToday, () => "");

    useEffect(() => {
        let cancelled = false;
        fetchMessages().then((result) => {
            if (cancelled) return;
            setMessages(result);
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    async function handleRefresh() {
        setRefreshing(true);
        setInvoicesRefreshKey((k) => k + 1);
        setMessages(await fetchMessages());
        setLoading(false);
        setRefreshing(false);
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Dashboard"
                description={
                    <>
                        Welcome back. Here&apos;s an overview of your site
                        {today && <span className="hidden sm:inline"> · {today}</span>}.
                    </>
                }
                actions={
                    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading || refreshing} className="gap-2">
                        <RefreshCw className={cn("h-4 w-4", (loading || refreshing) && "animate-spin")} />
                        Refresh
                    </Button>
                }
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Recent messages */}
                <SectionCard
                    title="Recent messages"
                    description={messages ? `${messages.total} total · ${messages.unread} unread` : "Latest contact form submissions"}
                    action={
                        <Button asChild variant="ghost" size="sm" className="-mr-2 gap-1 text-xs">
                            <Link href="/admin/contacts">
                                View all <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </Button>
                    }
                >
                    {loading ? (
                        <ul className="divide-y">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <li key={i} className="flex items-center gap-4 px-5 py-3.5">
                                    <Skeleton className="h-9 w-9 rounded-full" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-3.5 w-32" />
                                        <Skeleton className="h-3 w-3/4" />
                                    </div>
                                    <Skeleton className="h-3 w-12" />
                                </li>
                            ))}
                        </ul>
                    ) : !messages ? (
                        <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                                <AlertCircle className="h-6 w-6 text-red-500" />
                            </div>
                            <p className="mt-3 text-sm font-medium">Messages could not be loaded</p>
                            <p className="mt-1 text-xs text-muted-foreground">Check the database connection and refresh.</p>
                        </div>
                    ) : messages.recent.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                <Inbox className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="mt-3 text-sm font-medium">No messages yet</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Submissions from the public contact form will appear here.
                            </p>
                        </div>
                    ) : (
                        <ul className="divide-y">
                            {messages.recent.map((c) => (
                                <li key={c.id}>
                                    <Link
                                        href="/admin/contacts"
                                        className={cn(
                                            "flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/40",
                                            !c.is_read && "bg-amber-500/[0.04]"
                                        )}
                                    >
                                        <div className="relative shrink-0">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#021526]/10 text-xs font-semibold text-[#021526] dark:bg-white/10 dark:text-white">
                                                {initials(c.name) || "?"}
                                            </div>
                                            {!c.is_read && (
                                                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-card" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p dir="auto" className={cn("truncate text-sm", !c.is_read ? "font-semibold" : "font-medium")}>
                                                    {c.name}
                                                </p>
                                                <span className="hidden truncate text-xs text-muted-foreground sm:inline" dir="ltr">
                                                    {c.email}
                                                </span>
                                            </div>
                                            <p dir="auto" className="truncate text-xs text-muted-foreground">
                                                {c.message}
                                            </p>
                                        </div>
                                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{timeAgo(c.created_at)}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </SectionCard>

                {/* Invoices & quotations */}
                <DashboardInvoicesCard refreshKey={invoicesRefreshKey} />
            </div>
        </div>
    );
}
