"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/routing";
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
    ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const t = useTranslations("Navigation");
    const pathname = usePathname();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [authState, setAuthState] = useState<"checking" | "authenticated" | "unauthenticated">("checking");

    // If on login page, don't check auth
    const isLoginPage = pathname.includes("/admin/login");

    useEffect(() => {
        if (isLoginPage) {
            setAuthState("authenticated"); // Don't gate the login page
            return;
        }

        async function verifyAuth() {
            try {
                const res = await fetch("/api/auth/verify");
                const data = await res.json();
                if (data.authenticated) {
                    setAuthState("authenticated");
                } else {
                    setAuthState("unauthenticated");
                    router.push("/admin/login");
                }
            } catch {
                setAuthState("unauthenticated");
                router.push("/admin/login");
            }
        }

        verifyAuth();
    }, [isLoginPage, router]);

    const adminLinks = [
        { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/admin/content", label: "Page Content", icon: FileText },
        { href: "/admin/media", label: "Media Library", icon: ImageIcon },
        { href: "/admin/services", label: "Services", icon: Briefcase },
        { href: "/admin/partners", label: "Partners", icon: Users },
        { href: "/admin/experience", label: "Experience", icon: Briefcase },
        { href: "/admin/contacts", label: "Contact Messages", icon: Mail },
        { href: "/admin/settings", label: "Settings", icon: Settings },
    ];

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-[#021526] text-white">
            <div className="p-6 border-b border-white/10">
                <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                    Admin Panel
                </h2>
                <p className="text-xs text-gray-400 mt-1">Content Management</p>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {adminLinks.map((link) => {
                    const isActive = pathname.startsWith(link.href);
                    const Icon = link.icon;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setOpen(false)}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-[#78B7D0] text-white shadow-lg shadow-[#78B7D0]/20"
                                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <Icon className="h-5 w-5" />
                            {link.label}
                        </Link>
                    )
                })}
            </nav>

            <div className="p-4 border-t border-white/10">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-400/10 gap-3"
                    onClick={async () => {
                        await fetch("/api/auth/logout", { method: "POST" });
                        window.location.href = "/admin/login";
                    }}
                >
                    <LogOut className="h-5 w-5" />
                    Logout
                </Button>
            </div>
        </div>
    );

    // If on login page, don't show layout
    if (isLoginPage) {
        return <div className="min-h-screen bg-muted/20">{children}</div>;
    }

    // Show loading screen while checking authentication
    if (authState === "checking") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/20">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                        <ShieldAlert className="h-8 w-8 text-primary animate-pulse" />
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm font-medium">Verifying access...</span>
                    </div>
                </div>
            </div>
        );
    }

    // If unauthenticated, show nothing (redirect is happening)
    if (authState === "unauthenticated") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/20">
                <div className="flex flex-col items-center gap-4">
                    <ShieldAlert className="h-12 w-12 text-destructive" />
                    <p className="text-sm text-muted-foreground">Unauthorized. Redirecting to login...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-muted/20">
            {/* Desktop Sidebar */}
            <aside className="hidden md:block w-64 h-full shadow-2xl z-20">
                <SidebarContent />
            </aside>

            {/* Mobile Header */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="md:hidden flex items-center justify-between p-4 bg-[#021526] text-white shadow-md z-20">
                    <h2 className="font-bold">Admin Panel</h2>
                    <Sheet open={open} onOpenChange={setOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                                <Menu className="h-6 w-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 border-r-white/10 w-64 bg-[#021526]">
                            <SidebarContent />
                        </SheetContent>
                    </Sheet>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 overflow-auto p-4 md:p-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="mb-8">
                            {/* Breadcrumbs or Header context could go here */}
                        </div>
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

