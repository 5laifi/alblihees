"use client";

import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Instagram, Youtube, Mail, Phone } from "lucide-react";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";

interface ProfileData {
    name_en: string;
    short_bio_en: string;
    short_bio_ar: string;
    email: string;
    phone: string;
    social_instagram: string;
    social_youtube: string;
    social_twitter: string;
}

export function Footer({ locale }: { locale: string }) {
    const t = useTranslations("Common");
    const navT = useTranslations("Navigation");
    const currentYear = new Date().getFullYear();

    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [showLogo, setShowLogo] = useState(false);
    const [showContent, setShowContent] = useState(false);

    const footerRef = useRef<HTMLElement>(null);

    useEffect(() => {
        fetch("/api/admin/profile")
            .then(res => res.json())
            .then(data => { if (data && !data.error) setProfile(data); })
            .catch(() => { });
    }, []);

    // Manual IntersectionObserver — replays every time footer enters view
    useEffect(() => {
        const el = footerRef.current;
        if (!el) return;

        let timer1: ReturnType<typeof setTimeout>;
        let timer2: ReturnType<typeof setTimeout>;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    // Start animation
                    setShowLogo(true);
                    setShowContent(false);

                    timer1 = setTimeout(() => {
                        setShowLogo(false);
                        timer2 = setTimeout(() => {
                            setShowContent(true);
                        }, 500);
                    }, 2000);
                } else {
                    // Reset when footer leaves view
                    clearTimeout(timer1);
                    clearTimeout(timer2);
                    setShowLogo(false);
                    setShowContent(false);

                }
            },
            { threshold: 0.15 }
        );

        observer.observe(el);
        return () => {
            observer.disconnect();
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, []);

    const email = profile?.email || "Tharii@me.com";
    const phone = profile?.phone || "60001617";
    const bioText = profile
        ? (locale === "ar" ? profile.short_bio_ar : profile.short_bio_en)
        : "";

    const socialLinks = [
        { icon: Instagram, href: profile?.social_instagram || "https://instagram.com", label: "Instagram" },
        { icon: Youtube, href: profile?.social_youtube || "https://youtube.com/@ThariiMB", label: "Youtube" },
        { icon: () => <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>, href: profile?.social_twitter || "https://x.com", label: "X" },
    ];

    return (
        <footer ref={footerRef} className="bg-gradient-to-b from-[#021526] to-[#041E32] text-white border-t border-white/10 relative overflow-hidden" style={{ minHeight: "420px" }}>

            {/* Logo Intro Overlay */}
            <div
                className="absolute inset-0 z-20 flex items-center justify-center bg-gradient-to-b from-[#021526] to-[#041E32] transition-opacity duration-500"
                style={{
                    opacity: showLogo ? 1 : 0,
                    pointerEvents: showLogo ? "auto" : "none",
                }}
            >
                <div
                    className="transition-all duration-1000"
                    style={{
                        transform: showLogo ? "scale(1)" : "scale(0.3)",
                        opacity: showLogo ? 1 : 0,
                        filter: showLogo ? "blur(0px)" : "blur(10px)",
                    }}
                >
                    <Image
                        src="/logo.png"
                        alt="Logo"
                        width={280}
                        height={120}
                        className="object-contain drop-shadow-[0_0_40px_rgba(120,183,208,0.4)]"
                        priority
                    />
                </div>
            </div>

            {/* Footer Content */}
            <div
                className="pt-16 pb-8 relative z-10 transition-all duration-700 ease-out"
                style={{
                    opacity: showContent || (!showLogo && !showContent) ? 1 : 0,
                    transform: showContent || (!showLogo && !showContent) ? "translateY(0)" : "translateY(30px)",
                }}
            >
                <div className="container">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">

                        {/* Column 1: Brand */}
                        <div className="space-y-6">
                            <div className="relative h-16 w-40">
                                <Image
                                    src="/logo.png"
                                    alt="Thari Alblaihees"
                                    fill
                                    className="object-contain object-left rtl:object-right"
                                />
                            </div>
                            {bioText && (
                                <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                                    {bioText}
                                </p>
                            )}
                        </div>

                        {/* Column 2: Quick Links */}
                        <div className="lg:px-8">
                            <h4 className="font-bold text-lg mb-6 text-white">{t("quickLinks")}</h4>
                            <ul className="space-y-4">
                                {[
                                    { href: "/", label: navT("home") },
                                    { href: "/about", label: navT("about") },
                                    { href: "/services", label: navT("services") },

                                    { href: "/contact", label: navT("contact") },
                                ].map((link) => (
                                    <li key={link.href}>
                                        <Link
                                            href={link.href}
                                            className="text-gray-400 hover:text-[#78B7D0] transition-colors text-sm"
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Column 3: Contact Info */}
                        <div>
                            <h4 className="font-bold text-lg mb-6 text-white">{t("contactUs")}</h4>
                            <ul className="space-y-4">
                                <li>
                                    <a href={`mailto:${email}`} className="flex items-center gap-3 text-gray-400 hover:text-[#78B7D0] transition-colors group">
                                        <span className="p-2 bg-white/5 rounded-full group-hover:bg-[#78B7D0]/20 transition-colors">
                                            <Mail className="h-4 w-4" />
                                        </span>
                                        <span className="text-sm dir-ltr">{email}</span>
                                    </a>
                                </li>
                                <li>
                                    <a href={`tel:${phone}`} className="flex items-center gap-3 text-gray-400 hover:text-[#78B7D0] transition-colors group">
                                        <span className="p-2 bg-white/5 rounded-full group-hover:bg-[#78B7D0]/20 transition-colors">
                                            <Phone className="h-4 w-4" />
                                        </span>
                                        <span className="text-sm dir-ltr">{phone}</span>
                                    </a>
                                </li>
                            </ul>
                        </div>

                        {/* Column 4: Socials */}
                        <div>
                            <h4 className="font-bold text-lg mb-6 text-white">{t("followUs")}</h4>
                            <div className="flex items-center gap-4">
                                {socialLinks.map((social) => (
                                    <a
                                        key={social.label}
                                        href={social.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="h-10 w-10 flex items-center justify-center rounded-full bg-white/5 text-white hover:bg-[#78B7D0] hover:text-white transition-all duration-300"
                                        aria-label={social.label}
                                    >
                                        <social.icon className="h-5 w-5" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer Bottom */}
                    <div className="pt-8 border-t border-white/10 flex justify-center items-center text-sm text-gray-500">
                        <p>
                            {t("copyright", { year: currentYear })}
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
