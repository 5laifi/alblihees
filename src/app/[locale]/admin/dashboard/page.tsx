"use client";

import { useEffect, useState, useSyncExternalStore, type ComponentType } from "react";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Briefcase,
    Image as ImageIcon,
    Users,
    Mail,
    ArrowRight,
    ArrowUpRight,
    RefreshCw,
    Inbox,
    Video,
    Music,
    Camera,
    FileText,
    Upload,
    Plus,
    Award,
    Settings,
    Database,
    Wrench,
    Film,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Circle,
} from "lucide-react";

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

interface DashboardData {
    services: number | null;
    media: { total: number; video: number; audio: number; photo: number } | null;
    partners: { total: number; channels: number; entities: number } | null;
    contacts: { total: number; unread: number; recent: ContactSubmission[] } | null;
    settings: Record<string, string> | null;
}

type LoadState = "loading" | "ready" | "error";

const EMPTY: DashboardData = { services: null, media: null, partners: null, contacts: null, settings: null };

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

async function getJson<T>(url: string): Promise<T> {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    return res.json();
}

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

/** Fetches every dashboard source independently so one failure doesn't blank the page. */
async function fetchDashboard(): Promise<{ data: DashboardData; state: LoadState }> {
    const [services, media, partners, contacts, settings] = await Promise.allSettled([
        getJson<unknown[]>("/api/admin/services"),
        getJson<{ type: string }[]>("/api/admin/media"),
        getJson<{ category: string }[]>("/api/admin/partners"),
        getJson<ContactSubmission[]>("/api/admin/contacts"),
        getJson<Record<string, string>>("/api/admin/settings"),
    ]);

    const data: DashboardData = { ...EMPTY };

    if (services.status === "fulfilled" && Array.isArray(services.value)) {
        data.services = services.value.length;
    }
    if (media.status === "fulfilled" && Array.isArray(media.value)) {
        const list = media.value;
        data.media = {
            total: list.length,
            video: list.filter((m) => m.type === "video").length,
            audio: list.filter((m) => m.type === "audio").length,
            photo: list.filter((m) => m.type === "photo").length,
        };
    }
    if (partners.status === "fulfilled" && Array.isArray(partners.value)) {
        const list = partners.value;
        data.partners = {
            total: list.length,
            channels: list.filter((p) => p.category === "channel").length,
            entities: list.filter((p) => p.category === "entity").length,
        };
    }
    if (contacts.status === "fulfilled" && Array.isArray(contacts.value)) {
        const list = [...contacts.value].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        data.contacts = {
            total: list.length,
            unread: list.filter((c) => !c.is_read).length,
            recent: list.slice(0, 5),
        };
    }
    if (settings.status === "fulfilled" && settings.value && typeof settings.value === "object") {
        data.settings = settings.value;
    }

    const contentOk = [services, media, partners, contacts].every((r) => r.status === "fulfilled");
    return { data, state: contentOk ? "ready" : "error" };
}

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */

function SectionCard({
    title,
    description,
    action,
    children,
    className,
}: {
    title: string;
    description?: string;
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <section className={cn("flex flex-col rounded-xl border bg-card text-card-foreground shadow-sm", className)}>
            <header className="flex items-start justify-between gap-4 border-b px-5 py-4">
                <div>
                    <h2 className="text-sm font-semibold">{title}</h2>
                    {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
                </div>
                {action}
            </header>
            <div className="flex-1">{children}</div>
        </section>
    );
}

function StatusPill({ tone, children }: { tone: "green" | "amber" | "red" | "muted"; children: React.ReactNode }) {
    const styles = {
        green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        red: "bg-red-500/10 text-red-600 dark:text-red-400",
        muted: "bg-muted text-muted-foreground",
    };
    return (
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", styles[tone])}>
            {children}
        </span>
    );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AdminDashboardPage() {
    const [data, setData] = useState<DashboardData>(EMPTY);
    const [state, setState] = useState<LoadState>("loading");
    const [refreshing, setRefreshing] = useState(false);

    // Client-only date so the server render never disagrees with the browser's timezone.
    const today = useSyncExternalStore(subscribeNoop, formatToday, () => "");

    useEffect(() => {
        let cancelled = false;
        fetchDashboard().then((result) => {
            if (cancelled) return;
            setData(result.data);
            setState(result.state);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    async function handleRefresh() {
        setRefreshing(true);
        const result = await fetchDashboard();
        setData(result.data);
        setState(result.state);
        setRefreshing(false);
    }

    const loading = state === "loading";
    const unread = data.contacts?.unread ?? 0;

    /* ---------------- Stat cards ---------------- */

    const stats: {
        label: string;
        value: number | null;
        hint: string;
        href: string;
        icon: ComponentType<{ className?: string }>;
        tone: string;
        highlight?: boolean;
    }[] = [
            {
                label: "Services",
                value: data.services,
                hint: "Published on the services page",
                href: "/admin/services",
                icon: Briefcase,
                tone: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
            },
            {
                label: "Media items",
                value: data.media?.total ?? null,
                hint: data.media
                    ? `${data.media.video} video · ${data.media.audio} audio · ${data.media.photo} photo`
                    : "Videos, audio and photos",
                href: "/admin/media",
                icon: ImageIcon,
                tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
            },
            {
                label: "Partners",
                value: data.partners?.total ?? null,
                hint: data.partners
                    ? `${data.partners.channels} channels · ${data.partners.entities} entities`
                    : "Channels and organizations",
                href: "/admin/partners",
                icon: Users,
                tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            },
            {
                label: "Messages",
                value: data.contacts?.total ?? null,
                hint: unread > 0 ? `${unread} unread · needs attention` : "Inbox is up to date",
                href: "/admin/contacts",
                icon: Mail,
                tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                highlight: unread > 0,
            },
        ];

    /* ---------------- Quick actions ---------------- */

    const quickActions = [
        { label: "Edit profile & bio", description: "Name, titles, contact and socials", href: "/admin/content", icon: FileText },
        { label: "Upload media", description: "Add a video, audio clip or photo", href: "/admin/media", icon: Upload },
        { label: "Add a service", description: "Create a new public offering", href: "/admin/services", icon: Plus },
        { label: "Add a partner", description: "Channels and organizations", href: "/admin/partners", icon: Users },
        { label: "Update experience", description: "Stats and career timeline", href: "/admin/experience", icon: Award },
        { label: "Site settings", description: "Maintenance, hero video, password", href: "/admin/settings", icon: Settings },
    ];

    /* ---------------- Site status ---------------- */

    const settings = data.settings;
    const maintenanceOn = settings?.maintenance_mode === "true";
    const partnersVisible = settings ? settings.show_partners !== "false" : null;
    const heroVideoSet = settings ? Boolean(settings.hero_video_url) : null;

    const mediaBreakdown = [
        { label: "Videos", count: data.media?.video ?? 0, icon: Video, bar: "bg-sky-500" },
        { label: "Audio", count: data.media?.audio ?? 0, icon: Music, bar: "bg-violet-500" },
        { label: "Photos", count: data.media?.photo ?? 0, icon: Camera, bar: "bg-emerald-500" },
    ];
    const mediaMax = Math.max(1, ...mediaBreakdown.map((m) => m.count));

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Dashboard</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Welcome back. Here&apos;s an overview of your site
                        {today && <span className="hidden sm:inline"> · {today}</span>}.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading || refreshing} className="gap-2 self-start sm:self-auto">
                    <RefreshCw className={cn("h-4 w-4", (loading || refreshing) && "animate-spin")} />
                    Refresh
                </Button>
            </div>

            {/* Error banner */}
            {state === "error" && (
                <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    <div>
                        <p className="font-medium text-red-600 dark:text-red-400">Some data could not be loaded</p>
                        <p className="text-muted-foreground">
                            Check the database connection, then refresh. Sections that loaded are shown below.
                        </p>
                    </div>
                </div>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <Link
                            key={stat.label}
                            href={stat.href}
                            className={cn(
                                "group relative flex flex-col justify-between rounded-xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                                stat.highlight && "border-amber-500/40"
                            )}
                        >
                            <div className="flex items-start justify-between">
                                <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", stat.tone)}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 transition-colors group-hover:text-foreground" />
                            </div>
                            <div className="mt-4">
                                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                                {loading ? (
                                    <Skeleton className="mt-1.5 h-8 w-16" />
                                ) : (
                                    <p className="mt-0.5 text-3xl font-semibold tabular-nums tracking-tight">
                                        {stat.value ?? "—"}
                                    </p>
                                )}
                                <p className={cn("mt-1.5 text-xs", stat.highlight ? "font-medium text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
                                    {stat.hint}
                                </p>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Recent messages */}
                <SectionCard
                    title="Recent messages"
                    description={
                        data.contacts
                            ? `${data.contacts.total} total · ${data.contacts.unread} unread`
                            : "Latest contact form submissions"
                    }
                    action={
                        <Button asChild variant="ghost" size="sm" className="-mr-2 gap-1 text-xs">
                            <Link href="/admin/contacts">
                                View all <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </Button>
                    }
                    className="lg:col-span-2"
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
                    ) : !data.contacts ? (
                        <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                                <AlertCircle className="h-6 w-6 text-red-500" />
                            </div>
                            <p className="mt-3 text-sm font-medium">Messages could not be loaded</p>
                            <p className="mt-1 text-xs text-muted-foreground">Check the database connection and refresh.</p>
                        </div>
                    ) : data.contacts.recent.length === 0 ? (
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
                            {data.contacts.recent.map((c) => (
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

                {/* Site status */}
                <SectionCard title="Site status" description="Live configuration of the public site">
                    <ul className="divide-y">
                        <li className="flex items-center justify-between gap-3 px-5 py-3.5">
                            <div className="flex items-center gap-3">
                                <Database className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">Database</span>
                            </div>
                            {state === "loading" && (
                                <StatusPill tone="muted">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Checking
                                </StatusPill>
                            )}
                            {state === "ready" && (
                                <StatusPill tone="green">
                                    <CheckCircle2 className="h-3 w-3" /> Connected
                                </StatusPill>
                            )}
                            {state === "error" && (
                                <StatusPill tone="red">
                                    <AlertCircle className="h-3 w-3" /> Error
                                </StatusPill>
                            )}
                        </li>
                        <li className="flex items-center justify-between gap-3 px-5 py-3.5">
                            <div className="flex items-center gap-3">
                                <Wrench className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">Maintenance mode</span>
                            </div>
                            {!settings ? (
                                <StatusPill tone="muted">—</StatusPill>
                            ) : maintenanceOn ? (
                                <StatusPill tone="amber">
                                    <AlertCircle className="h-3 w-3" /> On · site hidden
                                </StatusPill>
                            ) : (
                                <StatusPill tone="green">
                                    <Circle className="h-2 w-2 fill-current" /> Off · site is live
                                </StatusPill>
                            )}
                        </li>
                        <li className="flex items-center justify-between gap-3 px-5 py-3.5">
                            <div className="flex items-center gap-3">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">Partners section</span>
                            </div>
                            {partnersVisible === null ? (
                                <StatusPill tone="muted">—</StatusPill>
                            ) : partnersVisible ? (
                                <StatusPill tone="green">Visible</StatusPill>
                            ) : (
                                <StatusPill tone="muted">Hidden</StatusPill>
                            )}
                        </li>
                        <li className="flex items-center justify-between gap-3 px-5 py-3.5">
                            <div className="flex items-center gap-3">
                                <Film className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">Hero video</span>
                            </div>
                            {heroVideoSet === null ? (
                                <StatusPill tone="muted">—</StatusPill>
                            ) : heroVideoSet ? (
                                <StatusPill tone="green">Set</StatusPill>
                            ) : (
                                <StatusPill tone="amber">Not set</StatusPill>
                            )}
                        </li>
                    </ul>
                    <div className="border-t px-5 py-3">
                        <Link
                            href="/admin/settings"
                            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                            Manage settings <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>
                </SectionCard>

                {/* Quick actions */}
                <SectionCard title="Quick actions" description="Jump straight to common tasks" className="lg:col-span-2">
                    <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
                        {quickActions.map((action) => {
                            const Icon = action.icon;
                            return (
                                <Link
                                    key={action.href + action.label}
                                    href={action.href}
                                    className="group flex items-start gap-3 rounded-lg border bg-background p-3.5 transition-colors hover:border-[#78B7D0] hover:bg-[#78B7D0]/5"
                                >
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-[#78B7D0]/15 group-hover:text-[#021526] dark:group-hover:text-[#78B7D0]">
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium leading-tight">{action.label}</p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">{action.description}</p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </SectionCard>

                {/* Media breakdown */}
                <SectionCard
                    title="Media library"
                    description={data.media ? `${data.media.total} items in total` : "Breakdown by type"}
                    action={
                        <Button asChild variant="ghost" size="sm" className="-mr-2 gap-1 text-xs">
                            <Link href="/admin/media">
                                Manage <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </Button>
                    }
                >
                    <div className="space-y-5 p-5">
                        {mediaBreakdown.map((m) => {
                            const Icon = m.icon;
                            const pct = loading ? 0 : Math.round((m.count / mediaMax) * 100);
                            return (
                                <div key={m.label}>
                                    <div className="mb-2 flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2">
                                            <Icon className="h-4 w-4 text-muted-foreground" />
                                            {m.label}
                                        </span>
                                        {loading ? (
                                            <Skeleton className="h-4 w-8" />
                                        ) : (
                                            <span className="font-medium tabular-nums">{data.media ? m.count : "—"}</span>
                                        )}
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                                        <div
                                            className={cn("h-full rounded-full transition-all duration-500", m.bar)}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </SectionCard>
            </div>
        </div>
    );
}
