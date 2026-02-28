"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save, Trash, Loader2, GripVertical } from "lucide-react";
import { toast } from "sonner";

interface Service {
    id: string;
    title_en: string;
    title_ar: string;
    description_en: string;
    description_ar: string;
    icon: string;
    whatsapp_message_en: string;
    whatsapp_message_ar: string;
    sort_order: number;
}

const ICONS = ["Tv", "Mic", "Users", "GraduationCap", "Calendar", "Video"];

export default function AdminServicesPage() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    useEffect(() => {
        fetchServices();
    }, []);

    async function fetchServices() {
        try {
            const res = await fetch("/api/admin/services");
            const data = await res.json();
            if (Array.isArray(data)) setServices(data);
        } catch {
            toast.error("Failed to load services");
        } finally {
            setLoading(false);
        }
    }

    async function handleSave(service: Service) {
        setSaving(service.id);
        try {
            const res = await fetch("/api/admin/services", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(service),
            });
            if (res.ok) {
                toast.success("Service saved!");
            } else {
                toast.error("Failed to save");
            }
        } catch {
            toast.error("Error saving service");
        } finally {
            setSaving(null);
        }
    }

    async function handleAdd() {
        try {
            const res = await fetch("/api/admin/services", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title_en: "New Service",
                    title_ar: "خدمة جديدة",
                    description_en: "",
                    description_ar: "",
                    icon: "Tv",
                    whatsapp_message_en: "",
                    whatsapp_message_ar: "",
                    sort_order: services.length,
                }),
            });
            if (res.ok) {
                toast.success("Service added!");
                fetchServices();
            }
        } catch {
            toast.error("Error adding service");
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Are you sure you want to delete this service?")) return;
        try {
            const res = await fetch(`/api/admin/services?id=${id}`, { method: "DELETE" });
            if (res.ok) {
                setServices((prev) => prev.filter((s) => s.id !== id));
                toast.success("Service deleted");
            }
        } catch {
            toast.error("Error deleting service");
        }
    }

    function updateField(id: string, field: keyof Service, value: string) {
        setServices((prev) =>
            prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Services</h1>
                    <p className="text-muted-foreground">Manage your service offerings</p>
                </div>
                <Button onClick={handleAdd} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Service
                </Button>
            </div>

            <div className="space-y-6">
                {services.map((service) => (
                    <Card key={service.id}>
                        <CardHeader className="flex flex-row items-start justify-between">
                            <div className="flex items-center gap-2">
                                <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                                <div>
                                    <CardTitle className="text-lg">{service.title_en}</CardTitle>
                                    <CardDescription>{service.title_ar}</CardDescription>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    onClick={() => handleSave(service)}
                                    disabled={saving === service.id}
                                    className="gap-1"
                                >
                                    {saving === service.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                    Save
                                </Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDelete(service.id)}
                                    className="gap-1"
                                >
                                    <Trash className="h-3 w-3" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Title (English)</Label>
                                    <Input
                                        value={service.title_en}
                                        onChange={(e) => updateField(service.id, "title_en", e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Title (Arabic)</Label>
                                    <Input
                                        value={service.title_ar}
                                        onChange={(e) => updateField(service.id, "title_ar", e.target.value)}
                                        dir="rtl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Description (English)</Label>
                                    <Textarea
                                        value={service.description_en}
                                        onChange={(e) => updateField(service.id, "description_en", e.target.value)}
                                        rows={3}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Description (Arabic)</Label>
                                    <Textarea
                                        value={service.description_ar}
                                        onChange={(e) => updateField(service.id, "description_ar", e.target.value)}
                                        dir="rtl"
                                        rows={3}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Icon</Label>
                                    <Select
                                        value={service.icon}
                                        onValueChange={(val) => updateField(service.id, "icon", val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ICONS.map((icon) => (
                                                <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
