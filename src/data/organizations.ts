export type OrganizationCategory = "channel" | "entity";

export interface Organization {
    id: string;
    nameAr: string;
    nameEn: string;
    category: OrganizationCategory;
    logo?: string; // Placeholder for now
}

export const organizations: Organization[] = [
    // Channels
    { id: "ktv", nameAr: "تلفزيون دولة الكويت", nameEn: "Kuwait TV", category: "channel" },
    { id: "watan", nameAr: "تلفزيون الوطن", nameEn: "Al-Watan TV", category: "channel" },
    { id: "majlis", nameAr: "تلفزيون المجلس", nameEn: "Al-Majlis TV", category: "channel" },
    { id: "rai", nameAr: "تلفزيون الراي", nameEn: "Al-Rai TV", category: "channel" },
    { id: "adala", nameAr: "تلفزيون العدالة", nameEn: "Al-Adala TV", category: "channel" },
    { id: "shasha", nameAr: "منصة القبس شاشا", nameEn: "Al-Qabas Shasha", category: "channel" },
    { id: "vo", nameAr: "منصة VO", nameEn: "VO Platform", category: "channel" },

    // Entities
    { id: "diwan", nameAr: "الديوان الأميري", nameEn: "Amiri Diwan", category: "entity" },
    { id: "parliament", nameAr: "مجلس الأمة", nameEn: "National Assembly", category: "entity" },
    { id: "kuniv", nameAr: "جامعة الكويت", nameEn: "Kuwait University", category: "entity" },
    { id: "paaet", nameAr: "الهيئة العامة للتعليم التطبيقي", nameEn: "PAAET", category: "entity" },
    { id: "media-forum", nameAr: "ملتقى الإعلام العربي", nameEn: "Arab Media Forum", category: "entity" },
    { id: "koc", nameAr: "شركة نفط الكويت", nameEn: "Kuwait Oil Company", category: "entity" },
    { id: "moi", nameAr: "وزارة الداخلية", nameEn: "Ministry of Interior", category: "entity" },
    { id: "moe", nameAr: "وزارة التربية", nameEn: "Ministry of Education", category: "entity" },
    { id: "moh", nameAr: "وزارة الصحة", nameEn: "Ministry of Health", category: "entity" },
    { id: "awqaf", nameAr: "وزارة الأوقاف والشؤون الإسلامية", nameEn: "Ministry of Awqaf", category: "entity" },
    { id: "sports", nameAr: "الهيئة العامة للرياضة", nameEn: "Public Authority for Sport", category: "entity" },
    { id: "youth", nameAr: "الهيئة العامة للشباب", nameEn: "Public Authority for Youth", category: "entity" },
    { id: "kisr", nameAr: "معهد الأبحاث العلمية", nameEn: "KISR", category: "entity" },
    { id: "library", nameAr: "المكتبة الوطنية", nameEn: "National Library", category: "entity" },
    { id: "aum", nameAr: "AUM", nameEn: "AUM", category: "entity" },
    { id: "ack", nameAr: "ACK", nameEn: "ACK", category: "entity" },
    { id: "auk", nameAr: "AUK", nameEn: "AUK", category: "entity" },
    { id: "gust", nameAr: "جامعة الخليج", nameEn: "GUST", category: "entity" },
    { id: "ktech", nameAr: "كلية الكويت التقنية", nameEn: "Kuwait Technical College", category: "entity" },
    { id: "acico", nameAr: "اسيكو", nameEn: "ACICO", category: "entity" },
    { id: "loyac", nameAr: "لوياك", nameEn: "LOYAC", category: "entity" },
    { id: "boubyan", nameAr: "بنك بوبيان", nameEn: "Boubyan Bank", category: "entity" },
    { id: "kfh", nameAr: "بيت التمويل الكويتي", nameEn: "KFH", category: "entity" },
    { id: "food-bank", nameAr: "البنك الكويتي للطعام", nameEn: "Kuwait Food Bank", category: "entity" },
    { id: "nuks", nameAr: "الاتحاد الوطني لطلبة الكويت", nameEn: "NUKS", category: "entity" },
    { id: "zain", nameAr: "زين", nameEn: "Zain", category: "entity" },
    { id: "stc", nameAr: "STC", nameEn: "STC", category: "entity" },
];
