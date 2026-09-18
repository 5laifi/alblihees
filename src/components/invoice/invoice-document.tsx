"use client";

/* eslint-disable @next/next/no-img-element */
// Plain <img> tags are intentional: the document is captured to PDF with
// html-to-image and printed, both of which need the raw image elements.

import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Globe, Mail, Phone } from "lucide-react";
import {
    DOC_LABELS,
    calcTotals,
    formatDocDate,
    formatMoney,
    formatNumber,
    toArabicDigits,
    type InvoiceData,
    type InvoiceSettings,
    type InvoiceTemplate,
    type PaymentStatus,
} from "@/lib/invoice-types";

// A4 at 96dpi. The height is 1px short of 297mm so printing never spills
// onto a second blank page.
export const DOC_WIDTH = 794;
export const DOC_MIN_HEIGHT = 1122;

const FONT_AR = "var(--font-tajawal), var(--font-inter), sans-serif";
const FONT_EN = "var(--font-inter), var(--font-tajawal), sans-serif";

interface Palette {
    ink: string;
    page: string;
    accent: string;
    muted: string;
}

const PALETTES: Record<InvoiceTemplate, Palette> = {
    stage: { ink: "#2c3a47", page: "#f6f9fe", accent: "#78B7D0", muted: "#6f7a86" },
    portrait: { ink: "#2c3a47", page: "#f6f9fe", accent: "#78B7D0", muted: "#6f7a86" },
    navy: { ink: "#021526", page: "#f7fafd", accent: "#78B7D0", muted: "#64748b" },
};

const HERO_HEIGHT: Record<InvoiceTemplate, number> = { stage: 353, portrait: 362, navy: 356 };
const COST_COL = 176;

// Layout density. The document starts roomy (0) and tightens itself up to
// two steps when the content would not fit on a single A4 page.
type Density = 0 | 1 | 2;
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function pick<T>(density: Density, roomy: T, compact: T, dense: T): T {
    return density === 0 ? roomy : density === 1 ? compact : dense;
}

interface InvoiceDocumentProps {
    data: InvoiceData;
    settings: InvoiceSettings;
    paymentStatus?: PaymentStatus;
}

export const InvoiceDocument = forwardRef<HTMLDivElement, InvoiceDocumentProps>(function InvoiceDocument(
    { data, settings, paymentStatus },
    ref
) {
    const template: InvoiceTemplate = PALETTES[data.template] ? data.template : "stage";
    const palette = PALETTES[template];

    // ----- auto-fit to one page -----
    const nodeRef = useRef<HTMLDivElement | null>(null);
    const setRefs = useCallback(
        (node: HTMLDivElement | null) => {
            nodeRef.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
        },
        [ref]
    );
    const signature = JSON.stringify([data, settings, paymentStatus]);
    const [fit, setFit] = useState<{ signature: string; density: Density }>({ signature, density: 0 });
    const [fontsReady, setFontsReady] = useState(false);
    const density: Density = fit.signature === signature ? fit.density : 0;

    useEffect(() => {
        let active = true;
        document.fonts?.ready.then(() => active && setFontsReady(true));
        return () => {
            active = false;
        };
    }, []);

    useIsomorphicLayoutEffect(() => {
        const node = nodeRef.current;
        if (!node || node.offsetHeight === 0) return;
        if (node.offsetHeight > DOC_MIN_HEIGHT + 1 && density < 2) {
            setFit({ signature, density: (density + 1) as Density });
        }
    }, [signature, density, fontsReady]);

    const many = data.items.length > 2;
    const rowPad = pick(density, many ? 16 : 26, 11, 7);
    const descSize = pick(density, many ? 15 : 17, 14.5, 13.5);
    const descLine = pick(density, many ? 1.75 : 1.95, 1.62, 1.5);
    const priceHeight = pick(density, 48, 44, 38);
    const priceSize = pick(density, 21, 19.5, 17.5);
    const payLine = pick(density, 1.95, 1.72, 1.55);
    const paySize = pick(density, 13.5, 13, 12.5);
    const qrSize = pick(density, 84, 78, 70);
    const numerals = settings.numerals;
    const { subtotal, discountAmount, total } = calcTotals(data.items, data.discount);
    const showTotals = data.items.length > 1 || data.discount > 0;
    const isPaid = data.documentType === "invoice" && paymentStatus === "paid";

    const terms = data.documentType === "quotation" ? settings.quotationTerms : settings.invoiceTerms;
    const hasCheque = Boolean(settings.payeeName);
    const hasBank = Boolean(settings.iban || settings.accountNumber || settings.accountName);
    const hasLiaison = Boolean(settings.liaisonName || settings.liaisonPhone);
    const contacts = [
        { icon: Phone, value: settings.phone },
        { icon: Mail, value: settings.email },
        { icon: Globe, value: settings.website },
    ].filter((c) => c.value);

    const page: CSSProperties = {
        width: DOC_WIDTH,
        minHeight: DOC_MIN_HEIGHT,
        background: palette.page,
        color: palette.ink,
        fontFamily: FONT_AR,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        lineHeight: 1.5,
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
    };

    return (
        <div ref={setRefs} dir="rtl" lang="ar" style={page}>
            {/* ---------- Watermarks ---------- */}
            <img
                src="/logo.png"
                alt=""
                aria-hidden
                style={{ position: "absolute", left: 178, top: 426, width: 468, pointerEvents: "none", userSelect: "none" }}
            />
            <div
                aria-hidden
                dir="ltr"
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 176,
                    textAlign: "center",
                    fontFamily: FONT_EN,
                    fontWeight: 800,
                    fontSize: 86,
                    letterSpacing: "-0.035em",
                    lineHeight: 1,
                    color: "#ffffff",
                    whiteSpace: "nowrap",
                    pointerEvents: "none",
                    userSelect: "none",
                }}
            >
                {settings.businessNameEn}
            </div>

            {/* ---------- Hero ---------- */}
            <Hero template={template} data={data} settings={settings} density={density} />

            {/* ---------- Services table ---------- */}
            <section style={{ position: "relative", padding: `${pick(density, 30, 20, 14)}px 40px 0` }}>
                {data.category ? (
                    <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
                        <span
                            style={{
                                background: palette.ink,
                                color: "#fff",
                                fontWeight: 800,
                                fontSize: 17,
                                padding: "7px 22px",
                                borderInlineStart: `4px solid ${palette.accent}`,
                            }}
                        >
                            <bdi>{data.category}</bdi>
                        </span>
                    </div>
                ) : null}

                <div
                    style={{
                        display: "flex",
                        alignItems: "stretch",
                        background: palette.ink,
                        color: "#ffffff",
                        fontWeight: 700,
                        fontSize: 15,
                        height: 38,
                    }}
                >
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        الوصف والخدمة
                    </div>
                    <div
                        style={{
                            width: COST_COL,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderInlineStart: "1px solid rgba(255,255,255,0.18)",
                        }}
                    >
                        التكلفة
                    </div>
                </div>

                {data.items.length === 0 ? (
                    <div style={{ padding: "56px 0", textAlign: "center", color: palette.muted, fontSize: 15 }}>
                        أضف الخدمات لتظهر هنا
                    </div>
                ) : (
                    data.items.map((item, index) => {
                        const lineTotal = (Number(item.price) || 0) * (Number(item.quantity) || 0);
                        const multiQty = Number(item.quantity) !== 1;
                        return (
                            <div
                                key={item.id}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    padding: `${rowPad}px 0`,
                                    borderBottom:
                                        index < data.items.length - 1 ? "1px solid rgba(44,58,71,0.14)" : "none",
                                    breakInside: "avoid",
                                }}
                            >
                                <div
                                    style={{
                                        flex: 1,
                                        textAlign: "center",
                                        whiteSpace: "pre-line",
                                        fontSize: descSize,
                                        lineHeight: descLine,
                                        fontWeight: 500,
                                        padding: "0 28px",
                                        overflowWrap: "anywhere",
                                        // each line takes its direction from its own first strong character
                                        unicodeBidi: "plaintext",
                                    }}
                                >
                                    {item.description}
                                </div>
                                <div style={{ width: COST_COL, flexShrink: 0 }}>
                                    <div
                                        style={{
                                            background: palette.ink,
                                            color: "#ffffff",
                                            fontWeight: 800,
                                            fontSize: priceSize,
                                            height: priceHeight,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        {formatMoney(lineTotal, data.currency, numerals)}
                                    </div>
                                    {multiQty ? (
                                        <div style={{ textAlign: "center", fontSize: 11.5, color: palette.muted, marginTop: 5 }}>
                                            {formatNumber(item.quantity, numerals)} × {formatMoney(item.price, data.currency, numerals)}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        );
                    })
                )}

                {showTotals && data.items.length > 0 ? (
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            borderTop: `2px solid ${palette.ink}`,
                            paddingTop: pick(density, 12, 8, 6),
                            breakInside: "avoid",
                        }}
                    >
                        {/* minWidth, not width: a long amount widens the block instead of wrapping inside it */}
                        <div style={{ minWidth: 300, fontSize: 14 }}>
                            <TotalsRow label="المجموع" value={formatMoney(subtotal, data.currency, numerals)} />
                            {data.discount > 0 ? (
                                <TotalsRow
                                    label={`الخصم (${formatNumber(data.discount, numerals, 2)}٪)`}
                                    value={`- ${formatMoney(discountAmount, data.currency, numerals)}`}
                                    color="#b4232a"
                                />
                            ) : null}
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    background: palette.ink,
                                    color: "#ffffff",
                                    marginTop: pick(density, 8, 6, 4),
                                    gap: 24,
                                    padding: "0 16px",
                                    height: pick(density, 46, 42, 36),
                                    fontWeight: 800,
                                    whiteSpace: "nowrap",
                                    borderInlineStart: `5px solid ${palette.accent}`,
                                }}
                            >
                                <span style={{ fontSize: 15 }}>الإجمالي</span>
                                <span style={{ fontSize: 20 }}>{formatMoney(total, data.currency, numerals)}</span>
                            </div>
                        </div>
                    </div>
                ) : null}

            </section>

            {/* ---------- Notes ---------- */}
            {data.notes.trim() ? (
                <section style={{ position: "relative", padding: `${pick(density, 18, 12, 8)}px 40px 0`, breakInside: "avoid" }}>
                    <div
                        style={{
                            borderInlineStart: `3px solid ${palette.accent}`,
                            background: "rgba(255,255,255,0.72)",
                            padding: pick(density, "10px 16px", "7px 14px", "5px 12px"),
                            fontSize: pick(density, 13, 12.5, 12),
                            lineHeight: pick(density, 1.8, 1.65, 1.5),
                            whiteSpace: "pre-line",
                            overflowWrap: "anywhere",
                        }}
                    >
                        <span style={{ fontWeight: 800 }}>ملاحظات:</span>
                        {data.notes
                            .trim()
                            .split("\n")
                            .map((line, i) => (
                                <div key={i} dir="auto" style={{ textAlign: "right" }}>
                                    {line || "\u00a0"}
                                </div>
                            ))}
                    </div>
                </section>
            ) : null}

            {/* ---------- Bottom block: QR + contacts | payment | date, number, liaison ---------- */}
            <section
                style={{
                    position: "relative",
                    marginTop: "auto",
                    padding: `${pick(density, 28, 16, 10)}px 40px ${pick(density, 22, 16, 12)}px`,
                    display: "grid",
                    gridTemplateColumns: "186px 1fr 186px",
                    alignItems: "end",
                    columnGap: 8,
                    breakInside: "avoid",
                }}
            >
                {/* Right: contacts */}
                <div dir="ltr" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", paddingBottom: 8 }}>
                    {settings.qrUrl ? (
                        <div style={{ position: "relative", width: qrSize, height: qrSize, marginBottom: contacts.length > 0 ? 14 : 0 }}>
                            <QRCodeSVG value={settings.qrUrl} size={qrSize} level="H" marginSize={0} bgColor="transparent" fgColor="#0b0f14" />
                            <div
                                style={{
                                    position: "absolute",
                                    left: (qrSize - 22) / 2,
                                    top: (qrSize - 22) / 2,
                                    width: 22,
                                    height: 22,
                                    background: palette.ink,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    outline: `2px solid ${palette.page}`,
                                }}
                            >
                                <img src="/logo.png" alt="" style={{ width: 17, height: 16, objectFit: "contain" }} />
                            </div>
                        </div>
                    ) : null}
                    {contacts.length > 0 ? (
                        <div style={{ display: "flex", alignItems: "stretch" }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", paddingRight: 9 }}>
                                {contacts.map((c) => (
                                    <div
                                        key={c.value}
                                        style={{
                                            height: 21,
                                            display: "flex",
                                            alignItems: "center",
                                            fontFamily: FONT_EN,
                                            fontSize: 12,
                                            fontWeight: 600,
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {c.value}
                                    </div>
                                ))}
                            </div>
                            <div style={{ background: palette.ink, width: 23, display: "flex", flexDirection: "column", alignItems: "center" }}>
                                {contacts.map((c) => (
                                    <div key={c.value} style={{ height: 21, display: "flex", alignItems: "center" }}>
                                        <c.icon size={11} color="#ffffff" strokeWidth={1.75} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Center: payment terms and bank details */}
                <div style={{ textAlign: "center", fontSize: paySize, lineHeight: payLine }}>
                    {hasCheque || hasBank ? <div>{terms}</div> : null}
                    {hasCheque ? (
                        <>
                            <div>شيك محرر بالإسم الكامل</div>
                            <div style={{ fontWeight: 800, fontSize: 14.5 }}>
                                <bdi>{settings.payeeName}</bdi>
                            </div>
                        </>
                    ) : null}
                    {hasBank ? (
                        <div style={{ marginTop: hasCheque ? pick(density, 14, 8, 4) : 0 }}>
                            <div>{hasCheque ? "أو عبر التحويل البنكي إلى الحساب التالي" : "عبر التحويل البنكي إلى الحساب التالي"}</div>
                            <div dir="ltr" style={{ fontFamily: FONT_EN, fontSize: 12.5, lineHeight: 1.8 }}>
                                {settings.iban ? (
                                    <div>
                                        IBAN: <b>{settings.iban}</b>
                                    </div>
                                ) : null}
                                {settings.accountNumber ? (
                                    <div>
                                        Account Number: <b>{settings.accountNumber}</b>
                                    </div>
                                ) : null}
                                {settings.accountName ? (
                                    <div>
                                        Account Name: <b>{settings.accountName}</b>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Left: date, number, liaison officer */}
                <div style={{ textAlign: "center", paddingBottom: 4 }}>
                    {isPaid ? (
                        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
                            <span
                                style={{
                                    transform: "rotate(-10deg)",
                                    border: "3px solid #1f8a5b",
                                    color: "#1f8a5b",
                                    borderRadius: 8,
                                    padding: "0 20px",
                                    fontSize: 25,
                                    fontWeight: 900,
                                    opacity: 0.88,
                                    background: "rgba(246,249,254,0.75)",
                                }}
                            >
                                مدفوعة
                            </span>
                        </div>
                    ) : null}
                    <div dir="ltr" style={{ fontFamily: FONT_EN, fontSize: 13, fontWeight: 600, lineHeight: 1.75 }}>
                        <div>
                            <span
                                style={{
                                    background: "rgba(44,58,71,0.10)",
                                    padding: "1px 5px",
                                    textDecoration: "underline",
                                    textUnderlineOffset: 3,
                                }}
                            >
                                {formatDocDate(data.issueDate)}
                            </span>
                        </div>
                        <div>
                            <span style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>No.{data.docNumber}</span>
                        </div>
                    </div>
                    {hasLiaison ? (
                        <div style={{ marginTop: 10, color: palette.muted }}>
                            {settings.liaisonTitle ? <div style={{ fontSize: 9.5 }}>{settings.liaisonTitle}</div> : null}
                            {settings.liaisonName ? (
                                <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.5 }}>{settings.liaisonName}</div>
                            ) : null}
                            {settings.liaisonPhone ? (
                                <div dir="ltr" style={{ fontSize: 11.5, fontWeight: 700, direction: "ltr", unicodeBidi: "bidi-override" }}>
                                    {numerals === "arabic" ? toArabicDigits(settings.liaisonPhone) : settings.liaisonPhone}
                                </div>
                            ) : null}
                            {settings.showSignature && settings.signatureUrl ? (
                                <img
                                    src={settings.signatureUrl}
                                    alt=""
                                    style={{ width: 84, height: 47, objectFit: "contain", margin: "4px auto 0", display: "block" }}
                                />
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </section>

            {/* ---------- Footer bar ---------- */}
            <div style={{ height: 24, background: palette.ink, flexShrink: 0, position: "relative" }}>
                <div style={{ position: "absolute", insetInlineStart: 0, top: 0, bottom: 0, width: 120, background: palette.accent }} />
            </div>
        </div>
    );
});

function TotalsRow({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        // nowrap: a label or an amount must never break onto the row below
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 24,
                padding: "3px 16px",
                color,
                fontWeight: 600,
                whiteSpace: "nowrap",
            }}
        >
            <span>{label}</span>
            <span>{value}</span>
        </div>
    );
}

function Hero({
    template,
    data,
    settings,
    density,
}: {
    template: InvoiceTemplate;
    data: InvoiceData;
    settings: InvoiceSettings;
    density: Density;
}) {
    // The logo, chip and client line need ~290px, so the hero never goes below that.
    // The portrait photo has a baked-in picture card that must stay clear of the text line.
    const height =
        template === "portrait" ? pick(density, HERO_HEIGHT.portrait, 344, 336) : pick(density, HERO_HEIGHT[template], 318, 292);
    const taglineStyle: CSSProperties =
        template === "stage"
            ? { left: 66, top: 96, width: 340, color: "#ffffff", fontSize: 23 }
            : { left: 36, top: template === "navy" && height < 350 ? 46 : 70, width: 330, color: "rgba(255,255,255,0.62)", fontSize: 22 };

    return (
        <header style={{ position: "relative", height, flexShrink: 0, overflow: "hidden", background: "#021526", color: "#ffffff" }}>
            {template === "navy" ? (
                <NavyHeroArt businessNameEn={settings.businessNameEn} heroHeight={height} />
            ) : (
                <img
                    src={template === "stage" ? "/invoice/hero-stage.jpg" : "/invoice/hero-portrait.jpg"}
                    alt=""
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
                />
            )}

            {/* bottom gradient keeps the client / project line readable on any photo */}
            <div
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 110,
                    background: "linear-gradient(to top, rgba(2,21,38,0.78), rgba(2,21,38,0))",
                }}
            />

            {settings.tagline ? (
                <div style={{ position: "absolute", textAlign: "center", fontWeight: 700, whiteSpace: "nowrap", ...taglineStyle }}>
                    <bdi>{settings.tagline}</bdi>
                </div>
            ) : null}

            {/* document type chip, centred under the logo block */}
            <div style={{ position: "absolute", right: 30, width: 160, top: template === "portrait" ? 222 : 214, display: "flex", justifyContent: "center" }}>
                <span
                    style={{
                        border: "1px solid rgba(255,255,255,0.45)",
                        background: "rgba(255,255,255,0.10)",
                        borderRadius: 999,
                        padding: "4px 20px",
                        fontSize: 15,
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                    }}
                >
                    {DOC_LABELS[data.documentType]}
                </span>
            </div>

            {/* client (right half) and project (left half) */}
            <div
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 14,
                    display: "flex",
                    alignItems: "flex-end",
                    fontSize: 13.5,
                    fontWeight: 800,
                    lineHeight: 1.55,
                }}
            >
                <div style={{ width: "50%", textAlign: "center", padding: "0 14px", overflowWrap: "anywhere" }}>
                    العميل : <bdi>{data.clientName || "—"}</bdi>
                </div>
                <div style={{ width: "50%", textAlign: "center", padding: "0 14px", overflowWrap: "anywhere" }}>
                    المشروع: <bdi>{data.projectName || "—"}</bdi>
                </div>
            </div>
        </header>
    );
}

// Hero drawn purely with the website's colours (navy + light blue accent).
function NavyHeroArt({ businessNameEn, heroHeight }: { businessNameEn: string; heroHeight: number }) {
    // The picture card shrinks with the hero so it never touches the project line.
    const cardTop = heroHeight >= 350 ? 108 : 84;
    const cardHeight = Math.min(186, heroHeight - cardTop - 58);
    const cardWidth = Math.round(cardHeight * 0.775);
    return (
        <>
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background: "radial-gradient(circle at 78% -10%, #0c3047 0%, #021526 62%)",
                }}
            />
            <div
                style={{
                    position: "absolute",
                    right: -120,
                    top: -160,
                    width: 460,
                    height: 460,
                    borderRadius: "50%",
                    background: "radial-gradient(circle, rgba(120,183,208,0.28), rgba(120,183,208,0) 68%)",
                }}
            />
            <div style={{ position: "absolute", left: 112, right: 64, top: 146, height: 1, background: "rgba(120,183,208,0.28)" }} />
            <div style={{ position: "absolute", left: 363, top: 46, bottom: 46, width: 1, background: "rgba(120,183,208,0.22)" }} />
            <img
                src="/main-portrait.jpg"
                alt=""
                style={{
                    position: "absolute",
                    left: 36,
                    top: cardTop,
                    width: cardWidth,
                    height: cardHeight,
                    objectFit: "cover",
                    objectPosition: "top",
                    borderRadius: 18,
                    border: "1px solid rgba(255,255,255,0.22)",
                    boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
                }}
            />
            <img src="/logo.png" alt="" style={{ position: "absolute", left: 627, top: 66, width: 126 }} />
            <div
                dir="ltr"
                style={{
                    position: "absolute",
                    right: 30,
                    width: 160,
                    top: 184,
                    textAlign: "center",
                    fontFamily: FONT_EN,
                    fontWeight: 800,
                    fontSize: 18,
                    letterSpacing: "-0.02em",
                    whiteSpace: "nowrap",
                }}
            >
                {businessNameEn}
            </div>
        </>
    );
}
