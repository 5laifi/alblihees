"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Save, Trash, Loader2, Edit, Upload } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

interface Organization {
    id: string;
    name_en: string;
    name_ar: string;
    category: string;
    logo_url: string;
    sort_order: number;
}

function LogoUpload({ currentUrl, onUploaded }: { currentUrl: string; onUploaded: (url: string) => void }) {
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    async function doUpload(file: File) {
        if (!file.type.startsWith("image/")) { toast.error("Please use an image file"); return; }
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("folder", "logos");
            const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
            const data = await res.json();
            if (res.ok && data.url) {
                onUploaded(data.url);
                toast.success("Logo uploaded!");
            } else {
                toast.error(data.error || "Upload failed");
            }
        } catch { toast.error("Upload error"); }
        finally { setUploading(false); if (inputRef.current) inputRef.current.value = ""; }
    }

    return (
        <div
            className={`flex items-center gap-2 p-1 rounded-lg border-2 border-dashed transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-transparent"
                }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) doUpload(f); }}
        >
            {currentUrl && (
                <div className="relative w-8 h-8 rounded bg-white overflow-hidden shrink-0">
                    <Image src={currentUrl} alt="" fill className="object-contain" />
                </div>
            )}
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif" onChange={(e) => { const f = e.target.files?.[0]; if (f) doUpload(f); }} className="hidden" />
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading} className="gap-1 h-7 text-xs">
                {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                {uploading ? "..." : currentUrl ? "Change" : "Upload"}
            </Button>
        </div>
    );
}

export default function AdminPartnersPage() {
    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchOrgs(); }, []);

    async function fetchOrgs() {
        try {
            const res = await fetch("/api/admin/partners");
            const data = await res.json();
            if (Array.isArray(data)) setOrgs(data);
        } catch { toast.error("Failed to load partners"); }
        finally { setLoading(false); }
    }

    async function handleSave(org: Organization) {
        setSaving(true);
        try {
            const res = await fetch("/api/admin/partners", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(org),
            });
            if (res.ok) { toast.success("Partner saved!"); setEditingId(null); }
            else toast.error("Failed to save");
        } catch { toast.error("Error saving"); }
        finally { setSaving(false); }
    }

    async function handleAdd() {
        try {
            const res = await fetch("/api/admin/partners", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name_en: "New Partner",
                    name_ar: "شريك جديد",
                    category: "entity",
                    logo_url: "",
                    sort_order: orgs.length,
                }),
            });
            if (res.ok) { toast.success("Partner added!"); fetchOrgs(); }
        } catch { toast.error("Error adding partner"); }
    }

    async function handleDelete(id: string) {
        if (!confirm("Are you sure?")) return;
        try {
            const res = await fetch(`/api/admin/partners?id=${id}`, { method: "DELETE" });
            if (res.ok) { setOrgs(prev => prev.filter(o => o.id !== id)); toast.success("Deleted"); }
        } catch { toast.error("Error deleting"); }
    }

    function updateField(id: string, field: keyof Organization, value: string) {
        setOrgs(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o));
    }

    const channels = orgs.filter(o => o.category === "channel");
    const entities = orgs.filter(o => o.category === "entity");

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

    function renderTable(title: string, items: Organization[]) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{items.length} items</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">Logo</TableHead>
                                <TableHead>Name (EN)</TableHead>
                                <TableHead>Name (AR)</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="w-[120px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((org) => (
                                <TableRow key={org.id}>
                                    <TableCell>
                                        <LogoUpload
                                            currentUrl={org.logo_url}
                                            onUploaded={(url) => {
                                                updateField(org.id, "logo_url", url);
                                                // Auto-save when logo is uploaded
                                                handleSave({ ...org, logo_url: url });
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {editingId === org.id ? (
                                            <Input value={org.name_en} onChange={(e) => updateField(org.id, "name_en", e.target.value)} className="h-8" />
                                        ) : org.name_en}
                                    </TableCell>
                                    <TableCell>
                                        {editingId === org.id ? (
                                            <Input value={org.name_ar} dir="rtl" onChange={(e) => updateField(org.id, "name_ar", e.target.value)} className="h-8" />
                                        ) : org.name_ar}
                                    </TableCell>
                                    <TableCell>
                                        {editingId === org.id ? (
                                            <Select value={org.category} onValueChange={(val) => updateField(org.id, "category", val)}>
                                                <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="channel">Channel</SelectItem>
                                                    <SelectItem value="entity">Entity</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <span className="px-2 py-1 rounded-full text-xs bg-muted">{org.category}</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            {editingId === org.id ? (
                                                <Button size="icon" variant="ghost" onClick={() => handleSave(org)} disabled={saving}>
                                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                                </Button>
                                            ) : (
                                                <Button size="icon" variant="ghost" onClick={() => setEditingId(org.id)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button size="icon" variant="ghost" className="text-red-500" onClick={() => handleDelete(org.id)}>
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Partners & Organizations</h1>
                    <p className="text-muted-foreground">Manage TV channels and entities — upload logos for each</p>
                </div>
                <Button onClick={handleAdd} className="gap-2"><Plus className="h-4 w-4" /> Add Partner</Button>
            </div>

            {renderTable("TV Channels", channels)}
            {renderTable("Entities & Organizations", entities)}
        </div>
    );
}
