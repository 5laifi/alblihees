"use client";

import { useTranslations } from "next-intl";
import { SectionWrapper } from "@/components/section-wrapper";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { Play } from "lucide-react";

interface MediaItem {
    id: string;
    title_en: string;
    title_ar: string;
    type: string;
    url: string;
}

export function FeaturedMedia({ locale, mediaItems }: { locale: string; mediaItems: MediaItem[] }) {
    const t = useTranslations("Home");

    return (
        <SectionWrapper>
            <div className="flex flex-col items-center mb-12 text-center">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">{t("featuredMediaTitle")}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Main Video Feature */}
                {(() => {
                    const featuredVideo = mediaItems.find(item => item.type === "video");
                    if (featuredVideo) {
                        return (
                            <Card className="overflow-hidden border-none shadow-lg relative aspect-video bg-black flex items-center justify-center">
                                {(() => {
                                    const ytMatch = featuredVideo.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
                                    const ytId = ytMatch ? ytMatch[1] : null;

                                    if (ytId) {
                                        return (
                                            <iframe
                                                className="w-full h-full"
                                                src={`https://www.youtube.com/embed/${ytId}?rel=0`}
                                                title={locale === 'ar' ? featuredVideo.title_ar : featuredVideo.title_en}
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            ></iframe>
                                        );
                                    }

                                    return (
                                        <video
                                            controls
                                            src={featuredVideo.url || undefined}
                                            className="w-full h-full object-cover"
                                        />
                                    );
                                })()}
                            </Card>
                        );
                    }
                    return (
                        <Card className="overflow-hidden border-none shadow-lg group cursor-pointer relative aspect-video">
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all z-10 flex items-center justify-center">
                                <div className="h-12 w-12 sm:h-16 sm:w-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-transform group-hover:scale-110">
                                    <Play className="fill-white text-white ml-1 h-6 w-6 sm:h-8 sm:w-8" />
                                </div>
                            </div>
                            <div className="absolute inset-0 bg-muted flex items-center justify-center text-muted-foreground">
                                Video Thumbnail
                            </div>
                        </Card>
                    );
                })()}

                {/* Main Audio/Second Feature */}
                {(() => {
                    const featuredAudio = mediaItems.find(item => item.type === "audio");
                    if (featuredAudio) {
                        return (
                            <Card className="overflow-hidden border-none shadow-lg relative aspect-video flex flex-col items-center justify-center bg-[#021526] text-white p-8 text-center">
                                <div className="space-y-4 relative z-10 w-full">
                                    <h3 className="text-xl sm:text-2xl font-bold">
                                        {locale === 'ar' ? featuredAudio.title_ar : featuredAudio.title_en}
                                    </h3>
                                    <div className="w-full max-w-sm mx-auto pt-4">
                                        <audio controls controlsList="nodownload noplaybackrate" src={featuredAudio.url || undefined} className="w-full h-10" />
                                    </div>
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-br from-[#78B7D0]/20 to-transparent pointer-events-none" />
                            </Card>
                        );
                    }
                    return (
                        <Card className="overflow-hidden border-none shadow-lg group cursor-pointer relative aspect-video flex items-center justify-center bg-zinc-900 text-white p-8 text-center">
                            <div className="space-y-4 relative z-10">
                                <h3 className="text-xl sm:text-2xl font-bold">Showreel {new Date().getFullYear()}</h3>
                                <p className="opacity-80 text-sm sm:text-base">Listen to the latest voice samples</p>
                                <div className="flex items-center justify-center gap-2 mt-4 text-accent">
                                    <Play className="fill-current h-6 w-6" />
                                    <span className="font-semibold">Play Audio Reel</span>
                                </div>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-transparent pointer-events-none" />
                        </Card>
                    );
                })()}
            </div>

            <div className="flex justify-center mt-10">
                <Button asChild variant="outline" size="lg" className="gap-2">
                    <Link href="/media">
                        <Play className="h-4 w-4 fill-current" />
                        {locale === "ar" ? "معرض الوسائط" : "Media Gallery"}
                    </Link>
                </Button>
            </div>
        </SectionWrapper>
    );
}
