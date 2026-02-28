"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { MaintenancePage } from "@/components/maintenance-page";

interface ConditionalLayoutProps {
    locale: string;
    children: React.ReactNode;
    maintenanceMode?: boolean;
}

export function ConditionalLayout({ locale, children, maintenanceMode = false }: ConditionalLayoutProps) {
    const pathname = usePathname();
    const isAdminRoute = pathname.includes("/admin");

    // Show maintenance page for public routes only
    if (maintenanceMode && !isAdminRoute) {
        return <MaintenancePage locale={locale} />;
    }

    if (isAdminRoute) {
        return <>{children}</>;
    }

    return (
        <div className="flex min-h-screen flex-col">
            <Header locale={locale} />
            <main className="flex-1 w-full">
                {children}
            </main>
            <Footer locale={locale} />
        </div>
    );
}
