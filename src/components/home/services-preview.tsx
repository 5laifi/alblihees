"use client";

import { useTranslations } from "next-intl";
import { SectionWrapper } from "@/components/section-wrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { motion } from "framer-motion";
import { Mic, Tv, Users, GraduationCap, Calendar, Video } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
    Tv, Mic, Users, GraduationCap, Calendar, Video,
};

interface ServiceItem {
    id: string;
    title_en: string;
    title_ar: string;
    description_en: string;
    description_ar: string;
    icon: string;
}

export function ServicesPreview({ locale, services }: { locale: string; services: ServiceItem[] }) {
    const t = useTranslations("Home");
    const commonT = useTranslations("Common");
    const isRtl = locale === 'ar';

    // Show only first 4 services on home
    const featuredServices = services.slice(0, 4);

    return (
        <SectionWrapper className="bg-muted/30">
            <div className="flex flex-col items-center mb-12 text-center">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">{t("servicesTitle")}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredServices.map((service, index) => {
                    const Icon = iconMap[service.icon] || Tv;
                    return (
                        <motion.div
                            key={service.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            viewport={{ once: true }}
                        >
                            <Card className="h-full hover:shadow-lg transition-all duration-300 border-none shadow-sm">
                                <CardHeader>
                                    <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center mb-4 text-accent">
                                        <Icon size={24} />
                                    </div>
                                    <CardTitle className="text-lg sm:text-xl">
                                        {isRtl ? service.title_ar : service.title_en}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <CardDescription className="text-base">
                                        {isRtl ? service.description_ar : service.description_en}
                                    </CardDescription>
                                </CardContent>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>

            <div className="flex justify-center mt-12">
                <Button asChild variant="outline" size="lg">
                    <Link href="/services">{commonT("viewMore")}</Link>
                </Button>
            </div>
        </SectionWrapper>
    );
}
