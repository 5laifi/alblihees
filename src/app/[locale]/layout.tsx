import type { Metadata } from "next";
import { Tajawal, Inter } from "next/font/google";
import "../globals.css";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ConditionalLayout } from "@/components/conditional-layout";
import { createServerSupabaseClient } from "@/lib/supabase";

// Fonts
const tajawal = Tajawal({
    subsets: ["arabic"],
    weight: ["200", "300", "400", "500", "700", "800", "900"],
    variable: "--font-tajawal",
});

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
});

export const metadata: Metadata = {
    title: "Thari Alblaihees | ضاري البليهيس",
    description: "Media Personality, Educator, and TV Presenter.",
};

async function isMaintenanceMode(): Promise<boolean> {
    try {
        const supabase = createServerSupabaseClient();
        const { data } = await supabase
            .from("site_settings")
            .select("value")
            .eq("key", "maintenance_mode")
            .single();
        return data?.value === "true";
    } catch {
        return false;
    }
}

export default async function RootLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    if (!routing.locales.includes(locale as any)) {
        notFound();
    }

    const messages = await getMessages();
    const dir = locale === 'ar' ? 'rtl' : 'ltr';
    const maintenance = await isMaintenanceMode();

    return (
        <html lang={locale} dir={dir} suppressHydrationWarning>
            <body
                className={`${tajawal.variable} ${inter.variable} antialiased bg-background text-foreground font-sans`}
            >
                <NextIntlClientProvider messages={messages}>
                    <ThemeProvider
                        attribute="class"
                        defaultTheme="system"
                        enableSystem
                        disableTransitionOnChange
                    >
                        <ConditionalLayout locale={locale} maintenanceMode={maintenance}>
                            {children}
                        </ConditionalLayout>
                        <Toaster />
                    </ThemeProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
