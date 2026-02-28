import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { SectionWrapper } from "@/components/section-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMediaItems } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Mic, Image as ImageIcon } from "lucide-react";

export default async function MediaPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations("Media");
    const isRtl = locale === 'ar';

    const mediaItems = await getMediaItems();
    const videos = mediaItems.filter((item) => item.type === 'video');
    const audios = mediaItems.filter((item) => item.type === 'audio');
    const photos = mediaItems.filter((item) => item.type === 'photo');

    return (
        <>
            <PageHeader
                title={t("title")}
            />

            <SectionWrapper>
                <Tabs defaultValue="video" className="w-full">
                    <div className="flex justify-center mb-8">
                        <TabsList className="grid w-full max-w-md grid-cols-3">
                            <TabsTrigger value="video">{t("video")}</TabsTrigger>
                            <TabsTrigger value="audio">{t("audio")}</TabsTrigger>
                            <TabsTrigger value="photos">{t("photos")}</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="video" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {videos.length > 0 ? videos.map((video) => (
                                <Card key={video.id} className="overflow-hidden border-none shadow-md flex flex-col">
                                    <div className="aspect-video bg-black relative flex items-center justify-center">
                                        {(() => {
                                            const ytMatch = video.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
                                            const ytId = ytMatch ? ytMatch[1] : null;

                                            if (ytId) {
                                                return (
                                                    <iframe
                                                        className="w-full h-full"
                                                        src={`https://www.youtube.com/embed/${ytId}?rel=0`}
                                                        title={isRtl ? video.title_ar : video.title_en}
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                        allowFullScreen
                                                    ></iframe>
                                                );
                                            }

                                            return (
                                                <video
                                                    controls
                                                    src={video.url || undefined}
                                                    className="w-full h-full object-contain"
                                                    poster={video.thumbnail_url || undefined}
                                                />
                                            );
                                        })()}
                                    </div>
                                    <CardContent className="p-4 flex-1">
                                        <h3 className="font-semibold text-lg line-clamp-2">
                                            {isRtl ? video.title_ar : video.title_en}
                                        </h3>
                                    </CardContent>
                                </Card>
                            )) : (
                                <p className="text-muted-foreground col-span-full text-center py-10">{t("noMedia") || "No videos found"}</p>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="audio" className="space-y-6">
                        <div className="space-y-4 max-w-3xl mx-auto">
                            {audios.length > 0 ? audios.map((audio) => (
                                <Card key={audio.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-colors">
                                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                                        <Mic size={24} />
                                    </div>
                                    <div className="flex-1 w-full space-y-2">
                                        <h3 className="font-semibold px-1">
                                            {isRtl ? audio.title_ar : audio.title_en}
                                        </h3>
                                        <audio controls controlsList="nodownload noplaybackrate" src={audio.url || undefined} className="w-full h-10" />
                                    </div>
                                </Card>
                            )) : (
                                <p className="text-muted-foreground text-center py-10">{t("noMedia") || "No audio tracks found"}</p>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="photos" className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {photos.length > 0 ? photos.map((photo) => (
                                <div key={photo.id} className="aspect-square bg-muted rounded-lg relative overflow-hidden group hover:shadow-xl transition-all cursor-zoom-in">
                                    <img
                                        src={photo.url || undefined}
                                        alt={isRtl ? photo.title_ar : photo.title_en}
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        loading="lazy"
                                    />
                                </div>
                            )) : (
                                <p className="text-muted-foreground col-span-full text-center py-10">{t("noMedia") || "No photos found"}</p>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </SectionWrapper>
        </>
    );
}
