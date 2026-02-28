"use client";

import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { ModeToggle } from "./mode-toggle";
import { LanguageSwitcher } from "./language-switcher";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Menu } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export function Header({ locale }: { locale: string }) {
    const t = useTranslations("Navigation");
    const [open, setOpen] = useState(false);

    const navLinks = [
        { href: "/", label: t("home") },
        { href: "/about", label: t("about") },
        { href: "/experience", label: t("experience") },

        { href: "/media", label: t("media") },
        { href: "/services", label: t("services") },
        { href: "/contact", label: t("contact") },
    ];

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between">
                {/* Logo */}
                <div className="flex items-center -ms-2">
                    <Link href="/" className="font-bold text-xl md:text-2xl text-primary block relative h-12 w-36 md:w-32">
                        <Image
                            src="/logo.png"
                            alt={locale === 'ar' ? "ضاري البليهيس" : "Thari Alblaihees"}
                            fill
                            className="object-contain dark:invert-0 invert"
                            priority
                        />
                    </Link>
                </div>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-6">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="text-sm font-medium transition-colors hover:text-accent"
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <LanguageSwitcher />
                    <ModeToggle />

                    {/* Mobile Menu */}
                    <div className="md:hidden">
                        <Sheet open={open} onOpenChange={setOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side={locale === 'ar' ? 'right' : 'left'}>
                                <div className="flex flex-col gap-4 mt-8">
                                    {navLinks.map((link) => (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            onClick={() => setOpen(false)}
                                            className="text-lg font-medium transition-colors hover:text-accent"
                                        >
                                            {link.label}
                                        </Link>
                                    ))}
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </div>
        </header>
    );
}
