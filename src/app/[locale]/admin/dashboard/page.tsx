"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Image as ImageIcon, Users, Activity, Mail, CheckCircle, AlertCircle, ReceiptText, ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { calcTotals, formatDocDate, formatMoney, round3, type SavedInvoice } from "@/lib/invoice-types";

interface DashboardStats {
    services: number;
    mediaItems: number;
    partners: number;
    contacts: number;
    unreadContacts: number;
}

interface InvoiceSummary {
    quotations: number;
    invoices: number;
    unpaid: number;
    /** Outstanding amount per currency, e.g. { KWD: 1200.5 } */
    outstanding: Record<string, number>;
    recent: SavedInvoice[];
}

const PAYMENT_BADGE: Record<SavedInvoice["paymentStatus"], { label: string; className: string }> = {
    unpaid: { label: "Unpaid", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
    partial: { label: "Partial", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
    paid: { label: "Paid", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
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

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [invoiceSummary, setInvoiceSummary] = useState<InvoiceSummary | null>(null);
    const [invoiceState, setInvoiceState] = useState<"loading" | "ready" | "setup" | "error">("loading");
    const [dbStatus, setDbStatus] = useState<"checking" | "connected" | "error">("checking");

    useEffect(() => {
        async function fetchStats() {
            try {
                const [servicesRes, mediaRes, partnersRes, contactsRes] = await Promise.all([
                    fetch("/api/admin/services"),
                    fetch("/api/admin/media"),
                    fetch("/api/admin/partners"),
                    fetch("/api/admin/contacts"),
                ]);

                const services = await servicesRes.json();
                const media = await mediaRes.json();
                const partners = await partnersRes.json();
                const contacts = await contactsRes.json();

                setStats({
                    services: Array.isArray(services) ? services.length : 0,
                    mediaItems: Array.isArray(media) ? media.length : 0,
                    partners: Array.isArray(partners) ? partners.length : 0,
                    contacts: Array.isArray(contacts) ? contacts.length : 0,
                    unreadContacts: Array.isArray(contacts) ? contacts.filter((c: { is_read: boolean }) => !c.is_read).length : 0,
                });
                setDbStatus("connected");
            } catch {
                setDbStatus("error");
            }
        }
        fetchStats();

        // Kept separate so a missing invoices setup never marks the whole site as down.
        async function fetchInvoices() {
            try {
                const res = await fetch("/api/admin/invoices");
                const body = await res.json().catch(() => ({}));
                if (body.code === "SETUP_REQUIRED") return setInvoiceState("setup");
                if (!res.ok || !Array.isArray(body.invoices)) return setInvoiceState("error");
                setInvoiceSummary(summarize(body.invoices));
                setInvoiceState("ready");
            } catch {
                setInvoiceState("error");
            }
        }
        fetchInvoices();
    }, []);

    const outstandingText =
        invoiceSummary && Object.keys(invoiceSummary.outstanding).length > 0
            ? Object.entries(invoiceSummary.outstanding)
                  .map(([currency, amount]) => formatMoney(amount, currency, "latin"))
                  .join(" + ")
            : "0";

    const statCards = [
        { label: "Services", value: stats?.services ?? "—", icon: FileText, color: "text-blue-500" },
        { label: "Media Items", value: stats?.mediaItems ?? "—", icon: ImageIcon, color: "text-purple-500" },
        { label: "Partners", value: stats?.partners ?? "—", icon: Users, color: "text-green-500" },
        { label: "Contact Messages", value: stats?.contacts ?? "—", icon: Mail, color: "text-orange-500" },
    ];

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Dashboard Overview</h1>
            <p className="text-muted-foreground">Welcome back, Admin. Here&apos;s what&apos;s happening on your site.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat) => (
                    <Card key={stat.label} className="border-t-4 border-t-primary/20 hover:border-t-primary transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {stat.label}
                            </CardTitle>
                            <stat.icon className={`h-4 w-4 ${stat.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{String(stat.value)}</div>
                            {stat.label === "Contact Messages" && stats && stats.unreadContacts > 0 && (
                                <p className="text-xs text-orange-500 font-medium mt-1">
                                    {stats.unreadContacts} unread
                                </p>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ---------- Invoices & quotations ---------- */}
            <Card className="border-t-4 border-t-[#78B7D0]">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="flex items-center gap-2">
                        <ReceiptText className="h-5 w-5 text-[#78B7D0]" />
                        Invoices &amp; Quotations
                    </CardTitle>
                    <Link href="/admin/invoices" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                        Open <ArrowUpRight className="h-4 w-4" />
                    </Link>
                </CardHeader>
                <CardContent className="space-y-6">
                    {invoiceState === "loading" && <p className="text-sm text-muted-foreground">Loading…</p>}
                    {invoiceState === "setup" && (
                        <p className="text-sm text-amber-600 dark:text-amber-400">
                            Invoice storage is not configured yet. Run supabase-invoices.sql and set SUPABASE_SERVICE_ROLE_KEY.
                        </p>
                    )}
                    {invoiceState === "error" && <p className="text-sm text-red-500">Could not load invoices.</p>}

                    {invoiceState === "ready" && invoiceSummary && (
                        <>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { label: "Quotations", value: String(invoiceSummary.quotations) },
                                    { label: "Invoices", value: String(invoiceSummary.invoices) },
                                    { label: "Awaiting payment", value: String(invoiceSummary.unpaid), warn: invoiceSummary.unpaid > 0 },
                                    { label: "Outstanding", value: outstandingText, warn: outstandingText !== "0" },
                                ].map((item) => (
                                    <div key={item.label} className="rounded-lg border p-4">
                                        <p className="text-xs text-muted-foreground">{item.label}</p>
                                        <p className={`mt-1 text-xl font-bold ${item.warn ? "text-orange-500" : ""}`}>
                                            <bdi>{item.value}</bdi>
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {invoiceSummary.recent.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    No documents yet.{" "}
                                    <Link href="/admin/invoices" className="font-medium text-primary hover:underline">
                                        Create the first one
                                    </Link>
                                    .
                                </p>
                            ) : (
                                <div>
                                    <p className="mb-2 text-sm font-medium">Latest documents</p>
                                    <ul className="divide-y rounded-lg border">
                                        {invoiceSummary.recent.map((doc) => (
                                            <li key={doc.id}>
                                                <Link href="/admin/invoices" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm hover:bg-muted/60">
                                                    <span className="flex min-w-0 items-center gap-3">
                                                        <span className="font-semibold whitespace-nowrap">
                                                            {doc.documentType === "invoice" ? "Invoice" : "Quotation"} #{doc.docNumber}
                                                        </span>
                                                        <bdi className="truncate text-muted-foreground">{doc.clientName}</bdi>
                                                    </span>
                                                    <span className="flex items-center gap-3 whitespace-nowrap">
                                                        {doc.documentType === "invoice" && (
                                                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_BADGE[doc.paymentStatus].className}`}>
                                                                {PAYMENT_BADGE[doc.paymentStatus].label}
                                                            </span>
                                                        )}
                                                        <span className="text-muted-foreground" dir="ltr">
                                                            {formatDocDate(doc.issueDate)}
                                                        </span>
                                                        <bdi className="font-bold">{formatMoney(calcTotals(doc.items, doc.discount).total, doc.currency, "latin")}</bdi>
                                                    </span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Contact Submissions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats && stats.contacts > 0 ? (
                            <p className="text-sm text-muted-foreground">
                                You have <span className="font-bold text-foreground">{stats.contacts}</span> total messages
                                {stats.unreadContacts > 0 && (
                                    <>, <span className="font-bold text-orange-500">{stats.unreadContacts} unread</span></>
                                )}
                                . Check the Contact Messages section for details.
                            </p>
                        ) : (
                            <p className="text-sm text-muted-foreground">No contact submissions yet.</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>System Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span>Database Connection</span>
                                {dbStatus === "checking" && (
                                    <span className="text-yellow-500 font-medium flex items-center gap-1">
                                        <Activity className="h-3 w-3 animate-spin" /> Checking...
                                    </span>
                                )}
                                {dbStatus === "connected" && (
                                    <span className="text-green-500 font-medium flex items-center gap-1">
                                        <CheckCircle className="h-3 w-3" /> Connected
                                    </span>
                                )}
                                {dbStatus === "error" && (
                                    <span className="text-red-500 font-medium flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" /> Error
                                    </span>
                                )}
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Authentication</span>
                                <span className="text-green-500 font-medium flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" /> Protected
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
