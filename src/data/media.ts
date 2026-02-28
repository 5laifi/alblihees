export interface MediaItem {
    id: string;
    titleAr: string;
    titleEn: string;
    type: "video" | "audio";
    url: string; // Placeholder or embed link
    thumbnail?: string;
}

export const mediaItems: MediaItem[] = [
    // Videos
    {
        id: "v1",
        titleAr: "مقابلة تلفزيونية - تلفزيون الكويت",
        titleEn: "TV Interview - Kuwait TV",
        type: "video",
        url: "https://www.youtube.com/embed/placeholder1",
    },
    {
        id: "v2",
        titleAr: "تقديم حفل تخرج جامعة الكويت",
        titleEn: "Hosting Kuwait University Graduation",
        type: "video",
        url: "https://www.youtube.com/embed/placeholder2",
    },
    {
        id: "v3",
        titleAr: "برنامج حواري - تلفزيون الراي",
        titleEn: "Talk Show - Al-Rai TV",
        type: "video",
        url: "https://www.youtube.com/embed/placeholder3",
    },

    // Audio
    {
        id: "a1",
        titleAr: "عينة صوتية 1 - إعلان",
        titleEn: "Audio Sample 1 - Commercial",
        type: "audio",
        url: "/audio/sample1.mp3",
    },
    {
        id: "a2",
        titleAr: "عينة صوتية 2 - وثائقي",
        titleEn: "Audio Sample 2 - Documentary",
        type: "audio",
        url: "/audio/sample2.mp3",
    },
    {
        id: "a3",
        titleAr: "عينة صوتية 3 - شعر",
        titleEn: "Audio Sample 3 - Poetry",
        type: "audio",
        url: "/audio/sample3.mp3",
    },
];
