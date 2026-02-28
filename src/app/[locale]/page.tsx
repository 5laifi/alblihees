import { Hero } from "@/components/home/hero";
import { Stats } from "@/components/home/stats";
import { ServicesPreview } from "@/components/home/services-preview";
import { LogoWall } from "@/components/home/logo-wall";
import { FeaturedMedia } from "@/components/home/featured-media";
import { getProfile, getServices, getExperienceStats, getOrganizations, getMediaItems, getSiteSettings } from "@/lib/data";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;

    // Fetch all data in parallel from Supabase
    const [profile, services, stats, organizations, mediaItems, settings] = await Promise.all([
        getProfile(),
        getServices(),
        getExperienceStats(),
        getOrganizations(),
        getMediaItems(),
        getSiteSettings(),
    ]);

    const showPartners = settings.show_partners !== "false";

    return (
        <div className="flex flex-col gap-0">
            <Hero locale={locale} profile={profile} heroVideoUrl={settings.hero_video_url} />
            <Stats locale={locale} stats={stats} />
            <ServicesPreview locale={locale} services={services} />
            <FeaturedMedia locale={locale} mediaItems={mediaItems} />
            {showPartners && <LogoWall locale={locale} organizations={organizations} />}
        </div>
    );
}
