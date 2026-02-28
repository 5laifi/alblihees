"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Save, Trash, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ExperienceStat {
    id: string;
    value: string;
    label_en: string;
    label_ar: string;
    sort_order: number;
}

interface TimelineEntry {
    id: string;
    role_en: string;
    role_ar: string;
    period_en: string;
    period_ar: string;
    description_en: string;
    description_ar: string;
    sort_order: number;
}

export default function AdminExperiencePage() {
    const [stats, setStats] = useState<ExperienceStat[]>([]);
    const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    useEffect(() => { fetchData(); }, []);

    async function fetchData() {
        try {
            const res = await fetch("/api/admin/experience");
            const data = await res.json();
            setStats(data.stats || []);
            setTimeline(data.timeline || []);
        } catch {
            toast.error("Failed to load experience data");
        } finally {
            setLoading(false);
        }
    }

    async function saveStat(stat: ExperienceStat) {
        setSaving(stat.id);
        try {
            const res = await fetch("/api/admin/experience", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ table: "stats", ...stat }),
            });
            if (res.ok) toast.success("Stat saved!");
            else toast.error("Failed to save");
        } catch { toast.error("Error saving"); }
        finally { setSaving(null); }
    }

    async function addStat() {
        try {
            const res = await fetch("/api/admin/experience", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    table: "stats",
                    value: "0",
                    label_en: "New Stat",
                    label_ar: "إحصائية جديدة",
                    sort_order: stats.length,
                }),
            });
            if (res.ok) { toast.success("Stat added!"); fetchData(); }
        } catch { toast.error("Error adding stat"); }
    }

    async function deleteStat(id: string) {
        if (!confirm("Delete this stat?")) return;
        try {
            const res = await fetch(`/api/admin/experience?id=${id}&table=stats`, { method: "DELETE" });
            if (res.ok) { setStats(prev => prev.filter(s => s.id !== id)); toast.success("Deleted"); }
        } catch { toast.error("Error deleting"); }
    }

    async function saveTimeline(entry: TimelineEntry) {
        setSaving(entry.id);
        try {
            const res = await fetch("/api/admin/experience", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ table: "timeline", ...entry }),
            });
            if (res.ok) toast.success("Entry saved!");
            else toast.error("Failed to save");
        } catch { toast.error("Error saving"); }
        finally { setSaving(null); }
    }

    async function addTimeline() {
        try {
            const res = await fetch("/api/admin/experience", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    table: "timeline",
                    role_en: "New Role",
                    role_ar: "دور جديد",
                    period_en: "2024",
                    period_ar: "2024",
                    description_en: "",
                    description_ar: "",
                    sort_order: timeline.length,
                }),
            });
            if (res.ok) { toast.success("Entry added!"); fetchData(); }
        } catch { toast.error("Error adding"); }
    }

    async function deleteTimeline(id: string) {
        if (!confirm("Delete this entry?")) return;
        try {
            const res = await fetch(`/api/admin/experience?id=${id}&table=timeline`, { method: "DELETE" });
            if (res.ok) { setTimeline(prev => prev.filter(t => t.id !== id)); toast.success("Deleted"); }
        } catch { toast.error("Error deleting"); }
    }

    if (loading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Experience Management</h1>

            {/* Stats Section */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Stats / Counters</h2>
                    <Button onClick={addStat} size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add Stat</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {stats.map((stat) => (
                        <Card key={stat.id}>
                            <CardContent className="pt-4 space-y-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 grid grid-cols-3 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Value</Label>
                                            <Input
                                                value={stat.value}
                                                onChange={(e) => setStats(prev => prev.map(s => s.id === stat.id ? { ...s, value: e.target.value } : s))}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Label (EN)</Label>
                                            <Input
                                                value={stat.label_en}
                                                onChange={(e) => setStats(prev => prev.map(s => s.id === stat.id ? { ...s, label_en: e.target.value } : s))}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Label (AR)</Label>
                                            <Input
                                                value={stat.label_ar}
                                                dir="rtl"
                                                onChange={(e) => setStats(prev => prev.map(s => s.id === stat.id ? { ...s, label_ar: e.target.value } : s))}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-1 ml-2">
                                        <Button size="icon" variant="ghost" onClick={() => saveStat(stat)} disabled={saving === stat.id}>
                                            {saving === stat.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        </Button>
                                        <Button size="icon" variant="ghost" className="text-red-500" onClick={() => deleteStat(stat.id)}>
                                            <Trash className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Timeline Section */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Career Timeline</h2>
                    <Button onClick={addTimeline} size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add Entry</Button>
                </div>
                <div className="space-y-4">
                    {timeline.map((entry) => (
                        <Card key={entry.id}>
                            <CardHeader className="flex flex-row items-start justify-between pb-2">
                                <div>
                                    <CardTitle className="text-lg">{entry.role_en}</CardTitle>
                                    <CardDescription>{entry.role_ar}</CardDescription>
                                </div>
                                <div className="flex gap-1">
                                    <Button size="sm" onClick={() => saveTimeline(entry)} disabled={saving === entry.id} className="gap-1">
                                        {saving === entry.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => deleteTimeline(entry.id)}>
                                        <Trash className="h-3 w-3" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Role (EN)</Label>
                                        <Input value={entry.role_en} onChange={(e) => setTimeline(prev => prev.map(t => t.id === entry.id ? { ...t, role_en: e.target.value } : t))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Role (AR)</Label>
                                        <Input value={entry.role_ar} dir="rtl" onChange={(e) => setTimeline(prev => prev.map(t => t.id === entry.id ? { ...t, role_ar: e.target.value } : t))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Period (EN)</Label>
                                        <Input value={entry.period_en} onChange={(e) => setTimeline(prev => prev.map(t => t.id === entry.id ? { ...t, period_en: e.target.value } : t))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Period (AR)</Label>
                                        <Input value={entry.period_ar} dir="rtl" onChange={(e) => setTimeline(prev => prev.map(t => t.id === entry.id ? { ...t, period_ar: e.target.value } : t))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Description (EN)</Label>
                                        <Textarea value={entry.description_en} onChange={(e) => setTimeline(prev => prev.map(t => t.id === entry.id ? { ...t, description_en: e.target.value } : t))} rows={2} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Description (AR)</Label>
                                        <Textarea value={entry.description_ar} dir="rtl" onChange={(e) => setTimeline(prev => prev.map(t => t.id === entry.id ? { ...t, description_ar: e.target.value } : t))} rows={2} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
