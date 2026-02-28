"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Loader2, Upload, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

interface Profile {
    name_en: string;
    name_ar: string;
    title_en: string;
    title_ar: string;
    short_bio_en: string;
    short_bio_ar: string;
    email: string;
    phone: string;
    whatsapp: string;
    location_en: string;
    location_ar: string;
    social_instagram: string;
    social_youtube: string;
    social_twitter: string;
    social_tiktok: string;
    image_url: string;
}

export default function AdminContentPage() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        async function fetchProfile() {
            try {
                const res = await fetch("/api/admin/profile");
                const data = await res.json();
                if (data && !data.error) setProfile(data);
            } catch { toast.error("Failed to load profile"); }
            finally { setLoading(false); }
        }
        fetchProfile();
    }, []);

    async function handleSave() {
        if (!profile) return;
        setSaving(true);
        try {
            const res = await fetch("/api/admin/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(profile),
            });
            if (res.ok) toast.success("Profile saved! Changes will appear on the site.");
            else toast.error("Failed to save");
        } catch { toast.error("Error saving profile"); }
        finally { setSaving(false); }
    }

    const [dragOver, setDragOver] = useState(false);

    async function uploadFile(file: File) {
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
            const data = await res.json();
            if (res.ok && data.url) {
                setProfile(prev => prev ? { ...prev, image_url: data.url } : null);
                toast.success("Image uploaded! Click 'Save All Changes' to apply.");
            } else {
                toast.error(data.error || "Upload failed");
            }
        } catch { toast.error("Error uploading image"); }
        finally { setUploading(false); }
    }

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        uploadFile(file);
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/")) uploadFile(file);
        else toast.error("Please drop an image file");
    }

    function updateField(field: keyof Profile, value: string) {
        setProfile(prev => prev ? { ...prev, [field]: value } : null);
    }

    if (loading || !profile) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Profile & Content</h1>
                    <p className="text-muted-foreground">Manage your profile information — changes appear on all public pages</p>
                </div>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save All Changes
                </Button>
            </div>

            {/* Profile Image Upload */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ImageIcon className="h-5 w-5" /> Main Profile Image</CardTitle>
                    <CardDescription>This image appears on the homepage hero section and about page</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row items-start gap-6">
                        {/* Current Image Preview */}
                        <div className="relative w-48 h-64 rounded-2xl overflow-hidden border-2 border-border bg-muted shrink-0">
                            {profile.image_url ? (
                                <Image
                                    src={profile.image_url}
                                    alt="Profile"
                                    fill
                                    className="object-cover object-top"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    <ImageIcon className="h-12 w-12" />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 space-y-4">
                            <div className="space-y-2">
                                <Label>Current Image URL</Label>
                                <Input
                                    value={profile.image_url}
                                    onChange={(e) => updateField("image_url", e.target.value)}
                                    placeholder="/main-portrait.jpg"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Upload New Image</Label>
                                <div
                                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                                        }`}
                                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                    />
                                    {uploading ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                            <p className="text-sm text-muted-foreground">Uploading...</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            <Upload className="h-8 w-8 text-muted-foreground" />
                                            <p className="text-sm font-medium">Drag & drop an image here</p>
                                            <p className="text-xs text-muted-foreground">or click to browse · JPEG, PNG, WebP, GIF · Max 5MB</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Personal Info */}
            <Card>
                <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Your name and title — displayed on the homepage hero and all pages</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Name (English)</Label>
                        <Input value={profile.name_en} onChange={(e) => updateField("name_en", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Name (Arabic)</Label>
                        <Input value={profile.name_ar} dir="rtl" onChange={(e) => updateField("name_ar", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Title (English)</Label>
                        <Input value={profile.title_en} onChange={(e) => updateField("title_en", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Title (Arabic)</Label>
                        <Input value={profile.title_ar} dir="rtl" onChange={(e) => updateField("title_ar", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Bio (English)</Label>
                        <Textarea value={profile.short_bio_en} onChange={(e) => updateField("short_bio_en", e.target.value)} rows={3} />
                    </div>
                    <div className="space-y-2">
                        <Label>Bio (Arabic)</Label>
                        <Textarea value={profile.short_bio_ar} dir="rtl" onChange={(e) => updateField("short_bio_ar", e.target.value)} rows={3} />
                    </div>
                </CardContent>
            </Card>

            {/* Contact Info */}
            <Card>
                <CardHeader>
                    <CardTitle>Contact Details</CardTitle>
                    <CardDescription>Email, phone, and location</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input value={profile.email} onChange={(e) => updateField("email", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input value={profile.phone} onChange={(e) => updateField("phone", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>WhatsApp Number</Label>
                        <Input value={profile.whatsapp} onChange={(e) => updateField("whatsapp", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Location (English)</Label>
                        <Input value={profile.location_en} onChange={(e) => updateField("location_en", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Location (Arabic)</Label>
                        <Input value={profile.location_ar} dir="rtl" onChange={(e) => updateField("location_ar", e.target.value)} />
                    </div>
                </CardContent>
            </Card>

            {/* Social Links */}
            <Card>
                <CardHeader>
                    <CardTitle>Social Media</CardTitle>
                    <CardDescription>Your social profile links</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Instagram</Label>
                        <Input value={profile.social_instagram} onChange={(e) => updateField("social_instagram", e.target.value)} placeholder="https://instagram.com/..." />
                    </div>
                    <div className="space-y-2">
                        <Label>YouTube</Label>
                        <Input value={profile.social_youtube} onChange={(e) => updateField("social_youtube", e.target.value)} placeholder="https://youtube.com/..." />
                    </div>
                    <div className="space-y-2">
                        <Label>Twitter / X</Label>
                        <Input value={profile.social_twitter} onChange={(e) => updateField("social_twitter", e.target.value)} placeholder="https://twitter.com/..." />
                    </div>
                    <div className="space-y-2">
                        <Label>TikTok</Label>
                        <Input value={profile.social_tiktok} onChange={(e) => updateField("social_tiktok", e.target.value)} placeholder="https://tiktok.com/..." />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
