"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Download, Loader2, Printer, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InvoiceDocument } from "@/components/invoice/invoice-document";
import { ScaledPreview } from "@/components/invoice/scaled-preview";
import { exportNodeToPdf } from "@/lib/invoice-export";
import { DEFAULT_INVOICE_SETTINGS, DOC_LABELS, docFileName, type InvoiceSettings, type SavedInvoice } from "@/lib/invoice-types";

// Print CSS: everything except the document is hidden, the preview scaling is
// switched off, and the document prints edge to edge with backgrounds kept.
const PRINT_CSS = `
@page { size: A4; margin: 0; }
@media print {
  html, body { background: #ffffff !important; background-image: none !important; margin: 0 !important; padding: 0 !important; }
  .invoice-no-print { display: none !important; }
  .invoice-print-area { padding: 0 !important; margin: 0 !important; max-width: none !important; background: #ffffff !important; }
  .invoice-scale-box { width: auto !important; height: auto !important; margin: 0 !important; }
  .invoice-scale-inner { transform: none !important; position: static !important; box-shadow: none !important; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
}
`;

export default function InvoicePrintPage() {
    const params = useParams<{ id: string }>();
    const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const [invoice, setInvoice] = useState<SavedInvoice | null>(null);
    const [settings, setSettings] = useState<InvoiceSettings>(DEFAULT_INVOICE_SETTINGS);
    const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
    const [exporting, setExporting] = useState(false);
    const docRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!id) return;
        let cancelled = false;
        (async () => {
            try {
                const [invRes, setRes] = await Promise.all([
                    fetch(`/api/admin/invoices?id=${encodeURIComponent(id)}`),
                    fetch("/api/admin/invoices/settings"),
                ]);
                const inv = await invRes.json().catch(() => ({}));
                const conf = await setRes.json().catch(() => ({}));
                if (cancelled) return;
                if (!invRes.ok || !inv.invoice) {
                    setState("missing");
                    return;
                }
                setInvoice(inv.invoice);
                if (conf.settings) setSettings(conf.settings);
                setState("ready");
            } catch {
                if (!cancelled) setState("missing");
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [id]);

    useEffect(() => {
        if (invoice) document.title = docFileName(invoice).replace(/\.pdf$/, "");
    }, [invoice]);

    async function download() {
        if (!docRef.current || !invoice) return;
        setExporting(true);
        try {
            await exportNodeToPdf(docRef.current, docFileName(invoice));
        } catch (error) {
            console.error("PDF export failed:", error);
            toast.error("تعذر إنشاء ملف PDF، جرّب زر الطباعة");
        } finally {
            setExporting(false);
        }
    }

    if (state === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (state === "missing" || !invoice) {
        return (
            <div dir="rtl" className="min-h-screen flex items-center justify-center text-muted-foreground">
                لم يتم العثور على المستند.
            </div>
        );
    }

    return (
        <div className="invoice-print-area min-h-screen bg-slate-200 dark:bg-[#010d18]">
            <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

            <div dir="rtl" className="invoice-no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 bg-[#021526] px-4 py-3 text-white shadow-lg">
                <div className="font-bold">
                    {DOC_LABELS[invoice.documentType]} <span dir="ltr">#{invoice.docNumber}</span>
                    <span className="mx-2 text-white/40">|</span>
                    <span className="font-normal text-white/80">{invoice.clientName}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={download} disabled={exporting} className="gap-2 bg-[#78B7D0] text-[#021526] hover:bg-[#9ccbe0]">
                        {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        تحميل PDF
                    </Button>
                    <Button onClick={() => window.print()} variant="outline" className="gap-2 border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
                        <Printer className="h-4 w-4" /> طباعة
                    </Button>
                    <Button onClick={() => window.close()} variant="ghost" className="gap-2 text-white hover:bg-white/10 hover:text-white">
                        <X className="h-4 w-4" /> إغلاق
                    </Button>
                </div>
            </div>

            <div className="invoice-print-area mx-auto max-w-[860px] p-4 sm:p-8">
                <ScaledPreview>
                    <InvoiceDocument ref={docRef} data={invoice} settings={settings} paymentStatus={invoice.paymentStatus} />
                </ScaledPreview>
            </div>
        </div>
    );
}
