"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Plus, Save, Trash, Loader2, Upload, Video, Music, ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface MediaItem {
    id: string;
    title_en: string;
    title_ar: string;
    type: string;
    url: string;
    thumbnail_url: string;
    sort_order: number;
}

function FileUploadButton({ accept, folder, onUploaded, label }: {
    accept: string;
    folder: string;
    onUploaded: (url: string) => void;
    label: string;
}) {
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    async function doUpload(file: File) {
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("folder", folder);
            const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
            const data = await res.json();
            if (res.ok && data.url) {
                onUploaded(data.url);
                toast.success("File uploaded!");
            } else {
                toast.error(data.error || "Upload failed");
            }
        } catch { toast.error("Upload error"); }
        finally { setUploading(false); if (inputRef.current) inputRef.current.value = ""; }
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) doUpload(file);
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) doUpload(file);
    }

    return (
        <div
            className={`inline-flex border-2 border-dashed rounded-lg transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-transparent"
                }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
        >
            <input ref={inputRef} type="file" accept={accept} onChange={handleChange} className="hidden" />
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="gap-1 shrink-0"
            >
                {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                {uploading ? "Uploading..." : label}
            </Button>
        </div>
    );
}

export default function AdminMediaPage() {
    const [items, setItems] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [itemToDelete, setItemToDelete] = useState<MediaItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => { fetchMedia(); }, []);

    async function fetchMedia() {
        try {
            const res = await fetch("/api/admin/media");
            const data = await res.json();
            if (Array.isArray(data)) setItems(data);
        } catch { toast.error("Failed to load media"); }
        finally { setLoading(false); }
    }

    async function handleSave(item: MediaItem) {
        setSaving(item.id);
        try {
            const res = await fetch("/api/admin/media", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(item),
            });
            if (res.ok) toast.success("Saved!");
            else toast.error("Failed to save");
        } catch { toast.error("Error saving"); }
        finally { setSaving(null); }
    }

    async function handleAdd(type: "video" | "audio" | "photo") {
        try {
            const res = await fetch("/api/admin/media", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title_en: type === "video" ? "New Video" : type === "audio" ? "New Audio" : "New Photo",
                    title_ar: type === "video" ? "فيديو جديد" : type === "audio" ? "صوت جديد" : "صورة جديدة",
                    type: type,
                    url: "",
                    thumbnail_url: "",
                    sort_order: items.length,
                }),
            });
            if (res.ok) { toast.success("Media added!"); fetchMedia(); }
        } catch { toast.error("Error adding media"); }
    }

    async function executeDelete() {
        if (!itemToDelete) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/admin/media?id=${itemToDelete.id}`, { method: "DELETE" });
            if (res.ok) {
                setItems(prev => prev.filter(i => i.id !== itemToDelete.id));
                toast.success("Deleted");
                setItemToDelete(null);
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to delete");
            }
        } catch { toast.error("Error deleting"); }
        finally { setIsDeleting(false); }
    }

    function updateField(id: string, field: keyof MediaItem, value: string) {
        setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
    }

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

    const videos = items.filter(i => i.type === "video");
    const audios = items.filter(i => i.type === "audio");
    const photos = items.filter(i => i.type === "photo");

    function getAcceptForType(type: string) {
        if (type === "video") return "video/mp4,video/webm";
        if (type === "audio") return "audio/mpeg,audio/mp3,audio/wav,audio/ogg";
        return "image/jpeg,image/png,image/webp,image/gif";
    }

    function getTypeIcon(type: string) {
        if (type === "video") return <Video className="h-4 w-4 text-purple-500" />;
        if (type === "audio") return <Music className="h-4 w-4 text-blue-500" />;
        return <ImageIcon className="h-4 w-4 text-green-500" />;
    }

    return (
        <div className="space-y-6">
            <Dialog open={!!itemToDelete} onOpenChange={(open) => !open && !isDeleting && setItemToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Media Item</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete &quot;{itemToDelete?.title_en}&quot;? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setItemToDelete(null)} disabled={isDeleting}>Cancel</Button>
                        <Button variant="destructive" onClick={executeDelete} disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash className="h-4 w-4 mr-2" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Media Library</h1>
                    <p className="text-muted-foreground">{items.length} items total</p>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button className="gap-2"><Plus className="h-4 w-4" /> Add Media</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleAdd("video")} className="gap-2 cursor-pointer">
                            <Video className="h-4 w-4 text-purple-500" /> Add Video
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAdd("audio")} className="gap-2 cursor-pointer">
                            <Music className="h-4 w-4 text-blue-500" /> Add Audio
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAdd("photo")} className="gap-2 cursor-pointer">
                            <ImageIcon className="h-4 w-4 text-green-500" /> Add Photo
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Media Items grouped by type */}
            {[
                { title: "Videos", items: videos, icon: <Video className="h-5 w-5" /> },
                { title: "Audio", items: audios, icon: <Music className="h-5 w-5" /> },
                { title: "Photos", items: photos, icon: <ImageIcon className="h-5 w-5" /> },
            ].map(({ title, items: sectionItems, icon }) => (
                <div key={title}>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">{icon} {title} ({sectionItems.length})</h2>
                    {sectionItems.length === 0 && (
                        <p className="text-sm text-muted-foreground mb-4">No {title.toLowerCase()} yet. Click &quot;Add Media&quot; above.</p>
                    )}
                    <div className="space-y-4">
                        {sectionItems.map((item) => (
                            <Card key={item.id}>
                                <CardHeader className="flex flex-row items-start justify-between pb-2">
                                    <div className="flex items-center gap-2">
                                        {getTypeIcon(item.type)}
                                        <div>
                                            <CardTitle className="text-base">{item.title_en}</CardTitle>
                                            <CardDescription>{item.title_ar}</CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button size="icon" variant="ghost" onClick={() => handleSave(item)} disabled={saving === item.id}>
                                            {saving === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        </Button>
                                        <Button size="icon" variant="ghost" className="text-red-500" onClick={() => setItemToDelete(item)}>
                                            <Trash className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Title (EN)</Label>
                                            <Input value={item.title_en} onChange={(e) => updateField(item.id, "title_en", e.target.value)} className="h-8" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Title (AR)</Label>
                                            <Input value={item.title_ar} dir="rtl" onChange={(e) => updateField(item.id, "title_ar", e.target.value)} className="h-8" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Type</Label>
                                            <Select value={item.type} onValueChange={(val) => updateField(item.id, "type", val)}>
                                                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="video">Video</SelectItem>
                                                    <SelectItem value="audio">Audio</SelectItem>
                                                    <SelectItem value="photo">Photo</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* URL or Upload */}
                                    <div className="space-y-2">
                                        <Label className="text-xs">
                                            {item.type === "video" ? "YouTube URL or Upload" : "File URL or Upload"}
                                        </Label>
                                        <div className="flex gap-2">
                                            <Input
                                                value={item.url}
                                                onChange={(e) => updateField(item.id, "url", e.target.value)}
                                                className="h-8"
                                                placeholder={item.type === "video" ? "https://www.youtube.com/embed/..." : "Enter URL or upload a file"}
                                            />
                                            <FileUploadButton
                                                accept={getAcceptForType(item.type)}
                                                folder={item.type === "video" ? "videos" : item.type === "audio" ? "audio" : "photos"}
                                                onUploaded={(url) => updateField(item.id, "url", url)}
                                                label="Browse"
                                            />
                                        </div>
                                        {item.url && (
                                            <p className="text-xs text-muted-foreground truncate">Current: {item.url}</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
