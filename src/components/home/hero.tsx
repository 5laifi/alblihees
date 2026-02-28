"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SectionWrapper } from "@/components/section-wrapper";
import { Link } from "@/i18n/routing";
import { motion } from "framer-motion";
import Image from "next/image";

interface ProfileData {
    name_en?: string;
    name_ar?: string;
    title_en?: string;
    title_ar?: string;
    short_bio_en?: string;
    short_bio_ar?: string;
    image_url?: string;
    whatsapp?: string;
}

export function Hero({ locale, profile, heroVideoUrl }: { locale: string; profile: ProfileData | null; heroVideoUrl?: string }) {
    const t = useTranslations("Home");
    const commonT = useTranslations("Common");

    const isRtl = locale === 'ar';
    const whatsappNumber = profile?.whatsapp || "60001617";

    const heroName = profile
        ? (isRtl ? profile.name_ar : profile.name_en) || t("heroTitle")
        : t("heroTitle");

    const heroTitle = profile
        ? (isRtl ? profile.title_ar : profile.title_en) || t("heroSubtitle")
        : t("heroSubtitle");

    const heroBio = profile
        ? (isRtl ? profile.short_bio_ar : profile.short_bio_en) || t("heroDescription")
        : t("heroDescription");

    const imageUrl = profile?.image_url || "/main-portrait.jpg";

    return (
        <SectionWrapper className="relative lg:min-h-[80vh] lg:flex lg:items-center lg:justify-center overflow-hidden bg-gradient-to-b from-background to-muted/20">

            {/* Background Video */}
            <div
                className="absolute inset-0 z-0 pointer-events-none"
                style={{
                    maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
                }}
            >
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover opacity-50"
                >
                    <source src={heroVideoUrl || "/hero-bg.mp4"} type="video/mp4" />
                </video>
                {/* Overlay for text readability */}
                <div className="absolute inset-0 bg-background/60" />
            </div>

            {/* Background Decorative Elements */}
            <div className="absolute inset-0 z-[1] opacity-10 pointer-events-none">
                <div className="absolute top-1/4 -left-20 w-72 h-72 bg-accent/30 rounded-full blur-[100px]" />
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 container pt-6 md:pt-20 pb-4 md:pb-0">

                {/* Mobile: Image FIRST, naturally in DOM flow */}
                <div className="block lg:hidden mb-6">
                    <div
                        className="w-full overflow-hidden shadow-2xl border-2 border-white/5 mx-auto"
                        style={{ borderRadius: '40px', maxWidth: '400px' }}
                    >
                        <Image
                            src={imageUrl}
                            alt={heroName}
                            width={400}
                            height={500}
                            className="w-full h-auto object-cover"
                            priority
                            style={{ borderRadius: '40px' }}
                        />
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row items-center justify-between gap-6 md:gap-12">
                    {/* Text Content */}
                    <div className="flex flex-col items-center lg:items-start text-center lg:text-start space-y-5 md:space-y-8 max-w-2xl">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-2 leading-tight">
                                {heroName}
                            </h1>
                            <h2 className="text-base sm:text-xl md:text-2xl font-medium text-accent mb-4 md:mb-6">
                                {heroTitle}
                            </h2>
                            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                                {heroBio}
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="flex flex-col sm:flex-row gap-3 pt-6 md:pt-4 justify-center w-full sm:w-auto"
                        >
                            <Button asChild size="lg" className="text-base md:text-lg px-6 md:px-8 h-12 md:h-14">
                                <Link href="/contact">
                                    {commonT("contactNow")}
                                </Link>
                            </Button>
                            <Button asChild variant="outline" size="lg" className="text-base md:text-lg px-6 md:px-8 h-12 md:h-14 gap-2">
                                <a href={`https://wa.me/965${whatsappNumber}`} target="_blank" rel="noopener noreferrer">
                                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                    {commonT("whatsapp")}
                                </a>
                            </Button>
                        </motion.div>
                    </div>

                    {/* Desktop: Portrait Image — only shown on lg+ */}
                    <div
                        className="hidden lg:block relative w-1/3 shadow-2xl border-4 border-white/5"
                        style={{ borderRadius: '50px', overflow: 'hidden' }}
                    >
                        <Image
                            src={imageUrl}
                            alt={heroName}
                            width={500}
                            height={700}
                            className="w-full h-auto object-cover"
                            priority
                            style={{ borderRadius: '50px' }}
                        />
                    </div>
                </div>
            </div>
        </SectionWrapper >
    );
}
