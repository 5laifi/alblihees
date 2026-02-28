import { ContactContent } from "@/components/contact-content";
import { getProfile } from "@/lib/data";

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const profile = await getProfile();
    return <ContactContent locale={locale} profile={profile} />;
}
