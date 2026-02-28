import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { SectionWrapper } from "@/components/section-wrapper";
import { getProfile } from "@/lib/data";
import Image from "next/image";

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations("About");
    const isRtl = locale === 'ar';

    const profile = await getProfile();

    return (
        <>
            <PageHeader
                title={t("title")}
                subtitle={isRtl ? (profile?.short_bio_ar || "") : (profile?.short_bio_en || "")}
            />

            <SectionWrapper>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
                    {/* Bio Text */}
                    <div className="space-y-6">
                        <h2 className="text-xl sm:text-2xl font-bold text-accent">{t("mission")}</h2>
                        <p className="text-base sm:text-lg leading-loose text-muted-foreground">
                            {isRtl
                                ? "أسعى دائماً لتوظيف خبراتي الإعلامية والتربوية في بناء محتوى هادف يلامس احتياجات المجتمع ويساهم في نشر الوعي والقيم الإيجابية. إيماني بأن الكلمة أمانة يدفعني دائماً لتقديم الأفضل."
                                : "I always strive to utilize my media and educational expertise to build meaningful content that touches the needs of society and contributes to spreading awareness and positive values. My belief that the word is a trust always drives me to provide the best."
                            }
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                            <div className="p-4 bg-muted/50 rounded-lg border">
                                <h3 className="font-bold mb-2">{t("vision")}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {isRtl ? "أن أكون صوتاً مؤثراً يجمع بين المهنية العالية والقيم الإنسانية." : "To be an influential voice combining high professionalism with human values."}
                                </p>
                            </div>
                            <div className="p-4 bg-muted/50 rounded-lg border">
                                <h3 className="font-bold mb-2">{t("values")}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {isRtl ? "المصداقية، الإبداع، التأثير الإيجابي، والالتزام." : "Credibility, creativity, positive impact, and commitment."}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Portrait Image */}
                    <div className="relative">
                        <div
                            className="aspect-[3/4] bg-muted shadow-2xl border-2 md:border-4 border-white/10"
                            style={{ borderRadius: '40px', overflow: 'hidden' }}
                        >
                            <Image
                                src={profile?.image_url || "/main-portrait.jpg"}
                                alt={isRtl ? (profile?.name_ar || "") : (profile?.name_en || "")}
                                fill
                                className="object-cover"
                                style={{ borderRadius: '40px' }}
                            />
                        </div>
                        <div className="absolute -bottom-6 -right-6 w-full h-full border-2 border-accent rounded-2xl -z-10 hidden md:block" />
                    </div>
                </div>
            </SectionWrapper>
        </>
    );
}
