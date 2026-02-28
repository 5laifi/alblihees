"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

export function LanguageSwitcher() {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();

    const toggleLanguage = () => {
        const nextLocale = locale === "ar" ? "en" : "ar";
        router.replace(pathname, { locale: nextLocale });
    };

    return (
        <Button variant="ghost" size="sm" onClick={toggleLanguage} aria-label="Switch Language" className="font-bold text-sm px-3">
            {locale === "ar" ? "EN" : "AR"}
        </Button>
    );
}
