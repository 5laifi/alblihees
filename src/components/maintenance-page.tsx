"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

export function MaintenancePage({ locale }: { locale: string }) {
    const t = useTranslations("Common");

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#021526] to-[#041E32] text-white px-4">
            {/* Logo */}
            <div className="relative h-24 w-60 mb-8">
                <Image
                    src="/logo.png"
                    alt="Logo"
                    fill
                    className="object-contain"
                    priority
                />
            </div>

            {/* Animated gear icon */}
            <div className="mb-8">
                <svg
                    className="h-16 w-16 text-[#78B7D0] animate-spin"
                    style={{ animationDuration: "3s" }}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                >
                    <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
            </div>

            {/* Message */}
            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-center">
                {locale === "ar" ? "الموقع تحت الصيانة" : "Under Maintenance"}
            </h1>
            <p className="text-gray-400 text-lg text-center max-w-md mb-8">
                {locale === "ar"
                    ? "نعمل على تحسين الموقع. سنعود قريباً إن شاء الله."
                    : "We're working on improving the site. We'll be back soon."}
            </p>

            {/* Pulse dots */}
            <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-[#78B7D0] animate-pulse" style={{ animationDelay: "0s" }} />
                <div className="w-3 h-3 rounded-full bg-[#78B7D0] animate-pulse" style={{ animationDelay: "0.3s" }} />
                <div className="w-3 h-3 rounded-full bg-[#78B7D0] animate-pulse" style={{ animationDelay: "0.6s" }} />
            </div>
        </div>
    );
}
