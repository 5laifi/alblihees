import { NextResponse } from "next/server";
import { verifyAdmin, unauthorizedResponse } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: Request) {
    if (!(await verifyAdmin())) return unauthorizedResponse();

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const folder = (formData.get("folder") as string) || "uploads";

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Whitelist allowed folders to prevent path traversal
        const allowedFolders = ["uploads", "logos", "videos", "audio", "photos"];
        if (!allowedFolders.includes(folder)) {
            return NextResponse.json({ error: "Invalid upload folder" }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = [
            // Images
            "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml",
            // Audio
            "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/aac",
            // Video
            "video/mp4", "video/webm", "video/ogg",
        ];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: "Invalid file type." }, { status: 400 });
        }

        // Cross-check extension against MIME type
        const mimeToExtensions: Record<string, string[]> = {
            "image/jpeg": ["jpg", "jpeg"],
            "image/png": ["png"],
            "image/webp": ["webp"],
            "image/gif": ["gif"],
            "image/svg+xml": ["svg"],
            "audio/mpeg": ["mp3"],
            "audio/mp3": ["mp3"],
            "audio/wav": ["wav"],
            "audio/ogg": ["ogg"],
            "audio/aac": ["aac", "m4a"],
            "video/mp4": ["mp4"],
            "video/webm": ["webm"],
            "video/ogg": ["ogg"],
        };

        const rawExt = (file.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const allowedExts = mimeToExtensions[file.type] || [];
        const ext = allowedExts.includes(rawExt) ? rawExt : allowedExts[0] || "bin";

        // Validate file size (50MB max for video, 10MB for audio, 5MB for images)
        const maxSize = file.type.startsWith("video/") ? 50 * 1024 * 1024
            : file.type.startsWith("audio/") ? 10 * 1024 * 1024
                : 5 * 1024 * 1024;

        if (file.size > maxSize) {
            const maxMB = maxSize / (1024 * 1024);
            return NextResponse.json({ error: `File too large. Maximum size is ${maxMB}MB.` }, { status: 400 });
        }

        // Generate unique filename
        const prefix = file.type.startsWith("image/") ? "img"
            : file.type.startsWith("audio/") ? "audio"
                : file.type.startsWith("video/") ? "video"
                    : "file";
        const filename = `${prefix}-${Date.now()}.${ext}`;

        // Save to public/<folder> directory
        const uploadsDir = path.join(process.cwd(), "public", folder);
        await mkdir(uploadsDir, { recursive: true });

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(path.join(uploadsDir, filename), buffer);

        const fileUrl = `/${folder}/${filename}`;

        revalidatePath("/[locale]", "page");

        return NextResponse.json({ url: fileUrl, filename });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}
