"use client";

import { Link, usePathname, useRouter } from "@/i18n/routing";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    FileText,
    Image as ImageIcon,
    Users,
    Briefcase,
    Settings,
    LogOut,
    Menu,
    Mail,
    Loader2,
    ShieldAlert,
    ShieldCheck,
    ExternalLink,
    Award,
    ChevronDown,
    ChevronRight,
    ReceiptText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ModeToggle } from "@/components/mode-toggle";
import { useState, useEffect, type ComponentType } from "react";

const ADMIN_EMAIL = "Tharii@me.com";

interface NavItem {
    href: string;
    label: string;
    icon: ComponentType<{ className?: string }>;
}

interface NavGroup {
    title: string;
    items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
    {
        title: "Overview",
        items: [{ href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard }],
    },
    {
        title: "Content",
        items: [
            { href: "/admin/content", label: "Profile & Content", icon: FileText },
            { href: "/admin/media", label: "Media Library", icon: ImageIcon },
            { href: "/admin/services", label: "Services", icon: Briefcase },
            { href: "/admin/partners", label: "Partners", icon: Users },
            { href: "/admin/experience", label: "Experience", icon: Award },
        ],
    },
    {
        title: "Finance",
        items: [{ href: "/admin/invoices", label: "Invoices & Quotes", icon: ReceiptText }],
    },
    {
        title: "Inbox",
        items: [{ href: "/admin/contacts", label: "Contact Messages", icon: Mail }],
    },
    {
        title: "System",
        items: [{ href: "/admin/settings", label: "Settings", icon: Settings }],
    },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
}

/* ------------------------------------------------------------------ */
/* Sidebar                                                             */
/* ------------------------------------------------------------------ */

function Sidebar({
    pathname,
    unreadCount,
    onNavigate,
}: {
    pathname: string;
    unreadCount: number;
    onNavigate?: () => void;
}) {
    return (
        <div className="flex h-full flex-col bg-[#021526] text-white">
            {/* Brand */}
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white/5 ring-1 ring-white/10">
                    <Image src="/logo.png" alt="Logo" fill className="object-contain p-1.5" sizes="40px" />
                </div>
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold leading-tight">Thari Alblaihees</p>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Admin Console</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-4">
                {NAV_GROUPS.map((group) => (
                    <div key={group.title} className="mb-5 last:mb-0">
                        <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            {group.title}
                        </p>
                        <ul className="space-y-0.5">
                            {group.items.map((item) => {
                                const isActive = pathname.startsWith(item.href);
                                const Icon = item.icon;
                                const showBadge = item.href === "/admin/contacts" && unreadCount > 0;
                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            onClick={onNavigate}
                                            className={cn(
                                                "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                                isActive
                                                    ? "bg-white/10 text-white"
                                                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                                            )}
                                        >
                                            {isActive && (
                                                <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-[#78B7D0]" />
                                            )}
                                            <Icon
                                                className={cn(
                                                    "h-[18px] w-[18px] shrink-0 transition-colors",
                                                    isActive ? "text-[#78B7D0]" : "text-slate-500 group-hover:text-slate-300"
                                                )}
                                            />
                                            <span className="truncate">{item.label}</span>
                                            {showBadge && (
                                                <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#78B7D0] px-1.5 text-[11px] font-semibold text-[#021526]">
                                                    {unreadCount > 99 ? "99+" : unreadCount}
                                                </span>
                                            )}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div className="border-t border-white/10 p-3">
                <div className="flex items-center gap-3 rounded-md bg-white/5 px-3 py-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#78B7D0]/20 text-xs font-semibold text-[#78B7D0]">
                        {ADMIN_EMAIL.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-white">Administrator</p>
                        <p className="truncate text-[11px] text-slate-400" dir="ltr">{ADMIN_EMAIL}</p>
                    </div>
                    <button
                        type="button"
                        onClick={logout}
                        title="Log out"
                        className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                        <LogOut className="h-4 w-4" />
                        <span className="sr-only">Log out</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [authState, setAuthState] = useState<"checking" | "authenticated" | "unauthenticated">("checking");
    const [unreadCount, setUnreadCount] = useState(0);

    // Login and reset-password pages are reachable without a session.
    const isPublicAdminPage = pathname.includes("/admin/login") || pathname.includes("/admin/reset-password");
    // Print view of an invoice: still auth-gated, but rendered without the admin chrome
    const isPrintPage = pathname.includes("/admin/invoices/print/");

    // The console is English and left-to-right, except the Arabic invoices
    // section, which is right-to-left. Portaled overlays (dialogs, menus,
    // toasts) and the print view render outside this layout's wrapper, so the
    // direction is set on <html> per route and restored on the way out. The
    // shell itself is pinned to dir="ltr" below, so it never flips.
    const isInvoicesRoute = pathname.includes("/admin/invoices");
    useEffect(() => {
        const root = document.documentElement;
        const previous = root.getAttribute("dir");
        root.setAttribute("dir", isInvoicesRoute ? "rtl" : "ltr");
        return () => {
            if (previous) root.setAttribute("dir", previous);
            else root.removeAttribute("dir");
        };
    }, [isInvoicesRoute]);

    useEffect(() => {
        // Public pages render before authState is consulted, so no check is needed.
        if (isPublicAdminPage) return;

        let cancelled = false;
        fetch("/api/auth/verify")
            .then((res) => res.json())
            .then((data) => {
                if (cancelled) return;
                if (data.authenticated) {
                    setAuthState("authenticated");
                } else {
                    setAuthState("unauthenticated");
                    router.push("/admin/login");
                }
            })
            .catch(() => {
                if (cancelled) return;
                setAuthState("unauthenticated");
                router.push("/admin/login");
            });
        return () => {
            cancelled = true;
        };
    }, [isPublicAdminPage, router]);

    // Unread badge for the inbox link. Re-checked on every route change so it
    // stays accurate after the admin reads messages.
    useEffect(() => {
        if (isPublicAdminPage || isPrintPage || authState !== "authenticated") return;
        let cancelled = false;
        fetch("/api/admin/contacts")
            .then((r) => (r.ok ? r.json() : []))
            .then((data) => {
                if (cancelled || !Array.isArray(data)) return;
                setUnreadCount(data.filter((c: { is_read: boolean }) => !c.is_read).length);
            })
            .catch(() => { });
        return () => {
            cancelled = true;
        };
    }, [pathname, authState, isPublicAdminPage, isPrintPage]);

    const currentItem = ALL_ITEMS.find((item) => pathname.startsWith(item.href));
    const pageTitle = currentItem?.label ?? "Admin";

    // Login / reset pages: no shell, but keep the admin UI left-to-right.
    if (isPublicAdminPage) {
        return (
            <div dir="ltr" className="admin-shell min-h-screen bg-muted/20">
                {children}
            </div>
        );
    }

    // Show loading screen while checking authentication
    if (authState === "checking") {
        return (
            <div dir="ltr" className="admin-shell flex min-h-screen items-center justify-center bg-muted/20">
                <div className="flex flex-col items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border bg-card shadow-sm">
                        <ShieldCheck className="h-7 w-7 text-[#78B7D0]" />
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm font-medium">Verifying access…</span>
                    </div>
                </div>
            </div>
        );
    }

    // If unauthenticated, show nothing (redirect is happening)
    if (authState === "unauthenticated") {
        return (
            <div dir="ltr" className="admin-shell flex min-h-screen items-center justify-center bg-muted/20">
                <div className="flex flex-col items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border bg-card shadow-sm">
                        <ShieldAlert className="h-7 w-7 text-destructive" />
                    </div>
                    <p className="text-sm text-muted-foreground">Unauthorized. Redirecting to login…</p>
                </div>
            </div>
        );
    }

    // Reached only when authenticated (the two checks above return first)
    if (isPrintPage) {
        return <>{children}</>;
    }

    return (
        <div dir="ltr" className="admin-shell flex h-screen bg-muted/20">
            {/* Desktop Sidebar */}
            <aside className="hidden h-full w-64 shrink-0 md:block">
                <Sidebar pathname={pathname} unreadCount={unreadCount} />
            </aside>

            <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
                {/* Top bar */}
                <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur md:px-8">
                    <div className="flex min-w-0 items-center gap-3">
                        <Sheet open={open} onOpenChange={setOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="icon" className="md:hidden">
                                    <Menu className="h-5 w-5" />
                                    <span className="sr-only">Open navigation</span>
                                </Button>
                            </SheetTrigger>
                            <SheetContent
                                side="left"
                                dir="ltr"
                                className="admin-shell w-72 border-r-white/10 bg-[#021526] p-0 text-white [&>button]:text-white"
                            >
                                <SheetTitle className="sr-only">Admin navigation</SheetTitle>
                                <Sidebar pathname={pathname} unreadCount={unreadCount} onNavigate={() => setOpen(false)} />
                            </SheetContent>
                        </Sheet>

                        <div className="min-w-0">
                            <nav className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                                <span>Admin</span>
                                <ChevronRight className="h-3 w-3" />
                                <span className="text-foreground">{pageTitle}</span>
                            </nav>
                            <h2 className="truncate text-base font-semibold leading-tight sm:hidden">{pageTitle}</h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <Button asChild variant="outline" size="sm" className="hidden gap-2 sm:inline-flex">
                            <Link href="/" target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                                View site
                            </Link>
                        </Button>
                        <ModeToggle />
                        <DropdownMenu dir="ltr">
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-9 gap-2 px-2">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#021526] text-xs font-semibold text-white dark:bg-[#78B7D0] dark:text-[#021526]">
                                        {ADMIN_EMAIL.charAt(0).toUpperCase()}
                                    </span>
                                    <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-60">
                                <DropdownMenuLabel className="font-normal">
                                    <p className="text-sm font-medium">Administrator</p>
                                    <p className="truncate text-xs text-muted-foreground">{ADMIN_EMAIL}</p>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/admin/settings" className="cursor-pointer">
                                        <Settings className="h-4 w-4" /> Settings
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/" target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                                        <ExternalLink className="h-4 w-4" /> View public site
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={logout}
                                    className="cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                                >
                                    <LogOut className="h-4 w-4" /> Log out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto">
                    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
