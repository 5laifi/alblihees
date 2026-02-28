import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { SectionWrapper } from "@/components/section-wrapper";
import { getExperienceTimeline, getOrganizations } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoWall } from "@/components/home/logo-wall";

export default async function ExperiencePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations("Experience");
    const isRtl = locale === 'ar';

    const [timeline, organizations] = await Promise.all([
        getExperienceTimeline(),
        getOrganizations(),
    ]);

    return (
        <>
            <PageHeader
                title={t("title")}
                subtitle={t("timeline")}
            />

            <SectionWrapper>
                <div className="max-w-4xl mx-auto space-y-8">
                    {timeline.map((item) => (
                        <Card key={item.id} className="relative border-l-4 border-l-accent shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                    <CardTitle className="text-xl md:text-2xl text-primary">
                                        {isRtl ? item.role_ar : item.role_en}
                                    </CardTitle>
                                    <span className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-bold w-fit">
                                        {isRtl ? item.period_ar : item.period_en}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground text-lg">
                                    {isRtl ? item.description_ar : item.description_en}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </SectionWrapper>

            <LogoWall locale={locale} organizations={organizations} />
        </>
    );
}
