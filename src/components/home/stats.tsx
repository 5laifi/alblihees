"use client";

import { useTranslations } from "next-intl";
import { SectionWrapper } from "@/components/section-wrapper";
import { motion } from "framer-motion";

interface StatItem {
    id: string;
    value: string;
    label_en: string;
    label_ar: string;
}

export function Stats({ locale, stats }: { locale: string; stats: StatItem[] }) {
    const t = useTranslations("Home");
    const isRtl = locale === 'ar';

    return (
        <SectionWrapper className="bg-primary text-primary-foreground">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                    <motion.div
                        key={stat.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        viewport={{ once: true }}
                        className="text-center space-y-1 md:space-y-2 p-3 md:p-4 rounded-lg border border-primary-foreground/10 bg-primary-foreground/5"
                    >
                        <h3 className="text-2xl sm:text-4xl md:text-5xl font-bold text-accent">
                            {stat.value}
                        </h3>
                        <p className="text-xs sm:text-sm md:text-base opacity-80 font-medium leading-tight">
                            {isRtl ? stat.label_ar : stat.label_en}
                        </p>
                    </motion.div>
                ))}
            </div>
        </SectionWrapper>
    );
}
