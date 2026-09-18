"use client";

import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Shared building blocks for the admin console.                       */
/* Every admin page composes these so the console reads as one system. */
/* ------------------------------------------------------------------ */

type IconType = ComponentType<{ className?: string }>;

/** Page heading row: title, muted description, optional actions on the right. */
export function PageHeader({
    title,
    description,
    actions,
    className,
}: {
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
            <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
                {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}

/** Bordered card with a titled header row. */
export function SectionCard({
    title,
    description,
    action,
    children,
    className,
    contentClassName,
}: {
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
    contentClassName?: string;
}) {
    return (
        <section className={cn("flex flex-col rounded-xl border bg-card text-card-foreground shadow-sm", className)}>
            <header className="flex items-start justify-between gap-4 border-b px-5 py-4">
                <div className="min-w-0">
                    <h2 className="text-sm font-semibold">{title}</h2>
                    {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </header>
            <div className={cn("flex-1", contentClassName)}>{children}</div>
        </section>
    );
}

export type PillTone = "green" | "amber" | "red" | "sky" | "muted";

const PILL_TONES: Record<PillTone, string> = {
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    red: "bg-red-500/10 text-red-600 dark:text-red-400",
    sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    muted: "bg-muted text-muted-foreground",
};

/** Small rounded status label. */
export function StatusPill({ tone, children, className }: { tone: PillTone; children: ReactNode; className?: string }) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium",
                PILL_TONES[tone],
                className
            )}
        >
            {children}
        </span>
    );
}

/** Compact metric tile used in summary rows. */
export function StatTile({
    label,
    value,
    hint,
    icon: Icon,
    iconClassName,
    warn,
    className,
}: {
    label: ReactNode;
    value: ReactNode;
    hint?: ReactNode;
    icon?: IconType;
    /** Tailwind classes for the icon box, e.g. "bg-sky-500/10 text-sky-600 dark:text-sky-400" */
    iconClassName?: string;
    /** Highlights the value in amber, for things that need attention */
    warn?: boolean;
    className?: string;
}) {
    return (
        <div className={cn("flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm", className)}>
            {Icon && (
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", iconClassName ?? "bg-muted text-muted-foreground")}>
                    <Icon className="h-4 w-4" />
                </div>
            )}
            <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className={cn("mt-0.5 truncate text-xl font-semibold tabular-nums tracking-tight", warn && "text-amber-600 dark:text-amber-400")}>
                    {value}
                </p>
                {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
            </div>
        </div>
    );
}

export interface SegmentedOption<T extends string> {
    value: T;
    label: ReactNode;
    count?: number;
    icon?: IconType;
}

/** Segmented control / tab strip, the same look as the contact-messages filters. */
export function SegmentedTabs<T extends string>({
    value,
    onChange,
    options,
    className,
    "aria-label": ariaLabel,
}: {
    value: T;
    onChange: (value: T) => void;
    options: SegmentedOption<T>[];
    className?: string;
    "aria-label"?: string;
}) {
    return (
        <div role="tablist" aria-label={ariaLabel} className={cn("inline-flex max-w-full flex-wrap gap-1 rounded-lg bg-muted/60 p-1", className)}>
            {options.map((option) => {
                const active = option.value === value;
                const Icon = option.icon;
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                            active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {Icon && <Icon className="h-4 w-4" />}
                        {option.label}
                        {typeof option.count === "number" && (
                            <span
                                className={cn(
                                    "rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                                    active ? "bg-muted text-foreground" : "bg-muted-foreground/15 text-muted-foreground"
                                )}
                            >
                                {option.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

/** Centered empty state for lists. */
export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className,
}: {
    icon: IconType;
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("flex flex-col items-center justify-center px-5 py-14 text-center", className)}>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Icon className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm font-medium">{title}</p>
            {description && <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

const NOTICE_TONES: Record<Exclude<PillTone, "muted" | "green">, { box: string; title: string; icon: string }> = {
    amber: { box: "border-amber-500/30 bg-amber-500/5", title: "text-amber-700 dark:text-amber-400", icon: "text-amber-500" },
    red: { box: "border-red-500/30 bg-red-500/5", title: "text-red-600 dark:text-red-400", icon: "text-red-500" },
    sky: { box: "border-[#78B7D0]/50 bg-[#78B7D0]/10", title: "text-[#021526] dark:text-[#78B7D0]", icon: "text-[#78B7D0]" },
};

/** Inline banner for warnings, errors and setup hints. */
export function InlineNotice({
    tone,
    icon: Icon,
    title,
    children,
    action,
    className,
}: {
    tone: "amber" | "red" | "sky";
    icon?: IconType;
    title?: ReactNode;
    children?: ReactNode;
    action?: ReactNode;
    className?: string;
}) {
    const t = NOTICE_TONES[tone];
    return (
        <div className={cn("flex flex-col gap-3 rounded-lg border px-4 py-3 text-sm sm:flex-row sm:items-start", t.box, className)}>
            {Icon && <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", t.icon)} />}
            <div className="min-w-0 flex-1">
                {title && <p className={cn("font-medium", t.title)}>{title}</p>}
                {children && <div className="text-muted-foreground">{children}</div>}
            </div>
            {action && <div className="flex shrink-0 flex-wrap gap-2 sm:pl-2">{action}</div>}
        </div>
    );
}
