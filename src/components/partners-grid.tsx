"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface Organization {
    id: string;
    name_en: string;
    name_ar: string;
    category: string;
    logo_url?: string;
}

export function PartnersGrid({ locale, organizations }: { locale: string; organizations: Organization[] }) {
    const t = useTranslations("Partners");
    const isRtl = locale === "ar";

    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState("all");

    const filteredOrgs = organizations.filter((org) => {
        const matchesSearch =
            org.name_ar.toLowerCase().includes(searchTerm.toLowerCase()) ||
            org.name_en.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFilter = filter === "all" || org.category === filter;

        return matchesSearch && matchesFilter;
    });

    return (
        <div className="space-y-8">
            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <Tabs defaultValue="all" className="w-full md:w-auto" onValueChange={setFilter}>
                    <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
                        <TabsTrigger value="all">{t("all")}</TabsTrigger>
                        <TabsTrigger value="channel">{t("channel")}</TabsTrigger>
                        <TabsTrigger value="entity">{t("entity")}</TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground rtl:right-3 rtl:left-auto" />
                    <Input
                        placeholder={t("searchPlaceholder")}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 rtl:pr-9 rtl:pl-3"
                    />
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                <AnimatePresence>
                    {filteredOrgs.map((org) => (
                        <motion.div
                            key={org.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Card className="aspect-square flex flex-col items-center justify-center p-6 text-center hover:shadow-lg transition-shadow gap-4 group">
                                {/* Logo on white background for consistency */}
                                <div className="flex-1 w-full rounded-xl flex items-center justify-center bg-white p-4 group-hover:scale-105 transition-transform overflow-hidden">
                                    {org.logo_url ? (
                                        <div className="relative w-full h-full">
                                            <Image
                                                src={org.logo_url}
                                                alt={isRtl ? org.name_ar : org.name_en}
                                                fill
                                                className="object-contain"
                                            />
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 text-xs font-medium">
                                            {(isRtl ? org.name_ar : org.name_en).slice(0, 3).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <h3 className="font-semibold text-sm line-clamp-2">
                                    {isRtl ? org.name_ar : org.name_en}
                                </h3>
                            </Card>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {filteredOrgs.length === 0 && (
                <div className="text-center py-20 text-muted-foreground">
                    No results found.
                </div>
            )}
        </div>
    );
}
