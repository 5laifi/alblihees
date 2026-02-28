"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Loader2, Lock, Video, Upload } from "lucide-react";
import { toast } from "sonner";

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Password fields
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");

    useEffect(() => {
        async function fetchSettings() {
            try {
                const res = await fetch("/api/admin/settings");
                const data = await res.json();
                if (data && !data.error) setSettings(data);
            } catch { toast.error("Failed to load settings"); }
            finally { setLoading(false); }
        }
        fetchSettings();
    }, []);

    async function saveSetting(key: string, value: string) {
        setSaving(true);
        try {
            const res = await fetch("/api/admin/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key, value }),
            });
            const data = await res.json();
            if (res.ok) {
                setSettings(prev => ({ ...prev, [key]: value }));
                toast.success("Setting saved!");
            } else {
                toast.error(data.error || "Failed to save");
            }
        } catch { toast.error("Error saving setting"); }
        finally { setSaving(false); }
    }

    async function handlePasswordChange() {
        if (!currentPassword || !newPassword) {
            toast.error("Please enter both current and new password");
            return;
        }
        if (newPassword.length < 6) {
            toast.error("New password must be at least 6 characters");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/admin/password", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const data = await res.json();

            if (res.ok) {
                toast.success("Password changed successfully! You can now use it to log in.");
                setCurrentPassword("");
                setNewPassword("");
            } else {
                toast.error(data.error || "Failed to change password");
            }
        } catch {
            toast.error("Something went wrong changing the password");
        } finally {
            setSaving(false);
        }
    }

    const [uploading, setUploading] = useState(false);
    const videoInputRef = useRef<HTMLInputElement>(null);

    async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("folder", "videos");
            const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
            const data = await res.json();
            if (res.ok && data.url) {
                await saveSetting("hero_video_url", data.url);
                toast.success("Hero video uploaded and saved!");
            } else {
                toast.error(data.error || "Upload failed");
            }
        } catch { toast.error("Error uploading video"); }
        finally { setUploading(false); if (videoInputRef.current) videoInputRef.current.value = ""; }
    }

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage site settings and preferences</p>

            {/* Feature Toggles */}
            <Card>
                <CardHeader>
                    <CardTitle>Site Features</CardTitle>
                    <CardDescription>Toggle site features on/off</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Maintenance Mode</Label>
                            <p className="text-sm text-muted-foreground">Disable public access to the site</p>
                        </div>
                        <Switch
                            checked={settings.maintenance_mode === "true"}
                            onCheckedChange={(checked) => saveSetting("maintenance_mode", String(checked))}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Show Partners Section</Label>
                            <p className="text-sm text-muted-foreground">Display partner logos on homepage</p>
                        </div>
                        <Switch
                            checked={settings.show_partners !== "false"}
                            onCheckedChange={(checked) => saveSetting("show_partners", String(checked))}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Hero Background Video */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Video className="h-5 w-5" /> Hero Background Video</CardTitle>
                    <CardDescription>Upload or set the background video shown behind the homepage hero section</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Video URL</Label>
                        <div className="flex gap-2">
                            <Input
                                value={settings.hero_video_url || ""}
                                onChange={(e) => setSettings(prev => ({ ...prev, hero_video_url: e.target.value }))}
                                placeholder="/hero-bg.mp4"
                            />
                            <Button
                                variant="outline"
                                onClick={() => saveSetting("hero_video_url", settings.hero_video_url || "")}
                                disabled={saving}
                                className="gap-1 shrink-0"
                            >
                                <Save className="h-4 w-4" /> Save
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Or Upload Video</Label>
                        <div className="flex items-center gap-3">
                            <input
                                ref={videoInputRef}
                                type="file"
                                accept="video/mp4,video/webm"
                                onChange={handleVideoUpload}
                                className="hidden"
                            />
                            <Button
                                variant="outline"
                                onClick={() => videoInputRef.current?.click()}
                                disabled={uploading}
                                className="gap-2"
                            >
                                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                {uploading ? "Uploading..." : "Choose Video File"}
                            </Button>
                            <p className="text-xs text-muted-foreground">MP4 or WebM · Max 50MB</p>
                        </div>
                    </div>
                    {settings.hero_video_url && (
                        <p className="text-xs text-muted-foreground">Current: <code className="bg-muted px-1 rounded">{settings.hero_video_url}</code></p>
                    )}
                </CardContent>
            </Card>

            {/* Password */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" /> Admin Password</CardTitle>
                    <CardDescription>Your admin password is set via environment variables for security</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Current Password</Label>
                            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>New Password</Label>
                            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                        </div>
                    </div>
                    <Button variant="outline" onClick={handlePasswordChange} disabled={saving} className="gap-2">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                        Change Password
                    </Button>
                    <p className="text-xs text-muted-foreground">
                        Note: Changing your password here will securely store it in the database and override the <code className="bg-muted px-1 rounded">ADMIN_PASSWORD</code> environment variable.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
