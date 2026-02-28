"use client";

import { useTranslations } from "next-intl";
import { SectionWrapper } from "@/components/section-wrapper";
import { motion } from "framer-motion";
import Image from "next/image";

interface OrgItem {
    id: string;
    name_en: string;
    name_ar: string;
    logo_url?: string;
}

export function LogoWall({ locale, organizations }: { locale: string; organizations: OrgItem[] }) {
    const t = useTranslations("Home");
    const isRtl = locale === 'ar';

    // Duplicate the full array for seamless infinite scroll
    const scrollingLogos = [...organizations, ...organizations];

    // Duration scales with number of logos for consistent speed
    const duration = Math.max(organizations.length * 2, 30);

    return (
        <SectionWrapper className="overflow-hidden bg-background border-y">
            <div className="flex flex-col items-center mb-10 text-center">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 opacity-80">{t("clientsTitle")}</h2>
            </div>

            <div className="relative flex w-full overflow-hidden">
                {/* Gradient Masks */}
                <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10" />
                <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />

                <motion.div
                    className="flex gap-6 sm:gap-12 items-center whitespace-nowrap py-4"
                    animate={{ x: isRtl ? ["0%", "50%"] : ["0%", "-50%"] }}
                    transition={{
                        repeat: Infinity,
                        ease: "linear",
                        duration,
                    }}
                    style={{ width: "max-content" }}
                >
                    {scrollingLogos.map((org, index) => (
                        <div
                            key={`${org.id}-${index}`}
                            className="flex flex-col items-center justify-center min-w-[100px] sm:min-w-[140px] transition-all duration-300 opacity-80 hover:opacity-100"
                        >
                            {org.logo_url ? (
                                <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-2">
                                    <Image
                                        src={org.logo_url}
                                        alt={isRtl ? org.name_ar : org.name_en}
                                        fill
                                        className="object-contain brightness-0 dark:brightness-0 dark:invert transition-[filter] duration-300"
                                    />
                                </div>
                            ) : (
                                <div className="h-20 w-20 sm:h-24 sm:w-24 flex items-center justify-center mb-2">
                                    <span className="text-xs text-muted-foreground font-bold">
                                        {(isRtl ? org.name_ar : org.name_en).slice(0, 3).toUpperCase()}
                                    </span>
                                </div>
                            )}
                            <span className="text-xs sm:text-sm font-medium">
                                {isRtl ? org.name_ar : org.name_en}
                            </span>
                        </div>
                    ))}
                </motion.div>
            </div>
        </SectionWrapper>
    );
}
