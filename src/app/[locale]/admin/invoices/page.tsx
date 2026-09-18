"use client";

import { useCallback, useEffect, useState } from "react";
import {
    AlertCircle,
    Banknote,
    Clock,
    Database,
    FilePlus2,
    FileText,
    HardDrive,
    Loader2,
    ReceiptText,
    Settings2,
    UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InlineNotice, PageHeader, SegmentedTabs, StatTile, StatusPill } from "@/components/admin/ui";
import { InvoiceList } from "@/components/invoice/invoice-list";
import { InvoiceSettingsForm } from "@/components/invoice/invoice-settings-form";
import { InvoiceWizard } from "@/components/invoice/invoice-wizard";
import {
    DEFAULT_INVOICE_SETTINGS,
    formatAmountMap,
    summarizeDocuments,
    type InvoiceSettings,
    type SavedInvoice,
} from "@/lib/invoice-types";

type TabKey = "create" | "invoices" | "quotations" | "settings";

const CODE_CLASS = "rounded bg-muted px-1 py-0.5 text-xs";

function plural(count: number, noun: string) {
    return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export default function AdminInvoicesPage() {
    const [tab, setTab] = useState<TabKey>("create");
    const [invoices, setInvoices] = useState<SavedInvoice[]>([]);
    const [settings, setSettings] = useState<InvoiceSettings>(DEFAULT_INVOICE_SETTINGS);
    const [nextNumber, setNextNumber] = useState(1);
    const [storage, setStorage] = useState<"supabase" | "local" | null>(null);
    const [setupRequired, setSetupRequired] = useState(false);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<SavedInvoice | null>(null);
    // Development only: data left in the local preview file that can be moved to the database.
    const [localPreview, setLocalPreview] = useState<{ documents: number; hasSettings: boolean } | null>(null);
    const [importing, setImporting] = useState(false);

    const load = useCallback(async () => {
        try {
            const [listRes, settingsRes] = await Promise.all([fetch("/api/admin/invoices"), fetch("/api/admin/invoices/settings")]);
            const list = await listRes.json().catch(() => ({}));
            const conf = await settingsRes.json().catch(() => ({}));

            if (list.code === "SETUP_REQUIRED" || conf.code === "SETUP_REQUIRED") {
                setSetupRequired(true);
                return;
            }
            if (!listRes.ok || !settingsRes.ok) throw new Error();

            setSetupRequired(false);
            setInvoices(Array.isArray(list.invoices) ? list.invoices : []);
            setNextNumber(list.nextNumber || 1);
            setStorage(list.storage || null);
            if (conf.settings) setSettings(conf.settings);

            // The preview file only exists in development; the route answers 404 in production.
            if (list.storage === "supabase" && process.env.NODE_ENV !== "production") {
                const preview = await fetch("/api/admin/invoices/import-local")
                    .then((res) => (res.ok ? res.json() : null))
                    .catch(() => null);
                setLocalPreview(preview?.preview ?? null);
            } else {
                setLocalPreview(null);
            }
        } catch {
            toast.error("Could not load invoices.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    async function importPreview(documents: boolean) {
        setImporting(true);
        try {
            const res = await fetch("/api/admin/invoices/import-local", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ documents }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok || !body.result) {
                toast.error("Could not move the preview data.");
                return;
            }
            const { settings: movedSettings, imported, skipped } = body.result;
            const parts = [movedSettings ? "Settings moved" : "Settings were already in the database"];
            if (documents) {
                parts.push(`${plural(imported, "document")} moved`);
                if (skipped) parts.push(`${plural(skipped, "duplicate")} skipped`);
            }
            toast.success(parts.join(" · "));
            await load();
        } catch {
            toast.error("Could not reach the server.");
        } finally {
            setImporting(false);
        }
    }

    function startNew() {
        setEditing(null);
        setTab("create");
    }

    const count = (type: SavedInvoice["documentType"]) => invoices.filter((inv) => inv.documentType === type).length;
    const summary = summarizeDocuments(invoices);
    const awaiting = summary.unpaid + summary.partial;
    const hasOutstanding = Object.values(summary.outstanding).some((amount) => amount > 0);

    const previewParts: string[] = [];
    if (localPreview?.hasSettings) previewParts.push("Settings");
    if (localPreview && localPreview.documents > 0) previewParts.push(plural(localPreview.documents, "document"));

    return (
        <div className="space-y-6">
            <PageHeader
                title="Invoices & Quotations"
                description="Create branded quotations and invoices, track payments and export PDFs."
                actions={
                    <>
                        {storage === "supabase" && (
                            <StatusPill tone="green">
                                <Database className="h-3 w-3" /> Connected to database
                            </StatusPill>
                        )}
                        {storage === "local" && (
                            <StatusPill tone="amber">
                                <HardDrive className="h-3 w-3" /> Preview mode · saved on this device
                            </StatusPill>
                        )}
                        <Button onClick={startNew} className="gap-2">
                            <FilePlus2 className="h-4 w-4" /> New document
                        </Button>
                    </>
                }
            />

            {setupRequired && (
                <InlineNotice tone="red" icon={AlertCircle} title="Database not set up yet">
                    Run <code className={CODE_CLASS}>supabase-invoices.sql</code> in the Supabase SQL editor, then add{" "}
                    <code className={CODE_CLASS}>SUPABASE_SERVICE_ROLE_KEY</code> to the environment variables and redeploy.
                </InlineNotice>
            )}

            {storage === "local" && (
                <InlineNotice tone="amber" icon={HardDrive} title="Preview mode">
                    <code className={CODE_CLASS}>SUPABASE_SERVICE_ROLE_KEY</code> is not set, so documents are saved to a file on this machine. Add the
                    key to <code className={CODE_CLASS}>.env.local</code> and to the Vercel environment variables, restart the server, and saving
                    switches to the database automatically.
                </InlineNotice>
            )}

            {localPreview && (
                <InlineNotice
                    tone="sky"
                    icon={UploadCloud}
                    title="Preview data ready to move to the database"
                    action={
                        <>
                            <Button size="sm" onClick={() => importPreview(false)} disabled={importing} className="gap-2">
                                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                                Move settings
                            </Button>
                            {localPreview.documents > 0 && (
                                <Button size="sm" variant="outline" onClick={() => importPreview(true)} disabled={importing}>
                                    Move settings and documents
                                </Button>
                            )}
                        </>
                    }
                >
                    {previewParts.length > 0 ? `${previewParts.join(" and ")} from the local preview file can be moved to the database.` : "The local preview file can be moved to the database."}
                </InlineNotice>
            )}

            {!setupRequired &&
                (loading ? (
                    <div className="space-y-6">
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-24 rounded-xl" />
                            ))}
                        </div>
                        <Skeleton className="h-9 w-full max-w-md rounded-lg" />
                        <Skeleton className="h-64 rounded-xl" />
                    </div>
                ) : (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <StatTile
                                label="Quotations"
                                value={summary.quotations}
                                icon={FileText}
                                iconClassName="bg-sky-500/10 text-sky-600 dark:text-sky-400"
                            />
                            <StatTile
                                label="Invoices"
                                value={summary.invoices}
                                icon={ReceiptText}
                                iconClassName="bg-violet-500/10 text-violet-600 dark:text-violet-400"
                            />
                            <StatTile
                                label="Awaiting payment"
                                value={awaiting}
                                icon={Clock}
                                iconClassName="bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                warn={awaiting > 0}
                                hint={
                                    summary.partial > 0
                                        ? `${summary.partial} partially paid`
                                        : summary.invoices > 0
                                          ? "All invoices settled"
                                          : undefined
                                }
                            />
                            <StatTile
                                label="Outstanding"
                                value={formatAmountMap(summary.outstanding)}
                                valueClassName={Object.keys(summary.outstanding).length > 1 ? "text-base" : undefined}
                                icon={Banknote}
                                iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                warn={hasOutstanding}
                                hint="Still owed on invoices"
                            />
                        </div>

                        <SegmentedTabs<TabKey>
                            aria-label="Invoice sections"
                            value={tab}
                            onChange={(key) => {
                                setTab(key);
                                if (key !== "create") setEditing(null);
                            }}
                            options={[
                                { value: "create", label: editing ? "Edit document" : "New document", icon: FilePlus2 },
                                { value: "quotations", label: "Quotations", icon: FileText, count: count("quotation") },
                                { value: "invoices", label: "Invoices", icon: ReceiptText, count: count("invoice") },
                                { value: "settings", label: "Settings", icon: Settings2 },
                            ]}
                        />

                        {tab === "create" ? (
                            <InvoiceWizard
                                editing={editing}
                                settings={settings}
                                nextNumber={nextNumber}
                                onCancelEdit={() => setEditing(null)}
                                onSaved={(saved) => {
                                    setEditing(null);
                                    setTab(saved.documentType === "invoice" ? "invoices" : "quotations");
                                    load();
                                }}
                            />
                        ) : tab === "settings" ? (
                            <InvoiceSettingsForm settings={settings} onSaved={setSettings} />
                        ) : (
                            <InvoiceList
                                documentType={tab === "invoices" ? "invoice" : "quotation"}
                                invoices={invoices}
                                settings={settings}
                                onChanged={load}
                                onEdit={(inv) => {
                                    setEditing(inv);
                                    setTab("create");
                                }}
                            />
                        )}
                    </>
                ))}
        </div>
    );
}
