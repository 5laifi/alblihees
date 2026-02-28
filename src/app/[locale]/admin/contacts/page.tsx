"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash, Eye, EyeOff, Mail } from "lucide-react";
import { toast } from "sonner";

interface ContactSubmission {
    id: string;
    name: string;
    email: string;
    phone: string;
    message: string;
    is_read: boolean;
    created_at: string;
}

export default function AdminContactsPage() {
    const [contacts, setContacts] = useState<ContactSubmission[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchContacts(); }, []);

    async function fetchContacts() {
        try {
            const res = await fetch("/api/admin/contacts");
            const data = await res.json();
            if (Array.isArray(data)) setContacts(data);
        } catch { toast.error("Failed to load contacts"); }
        finally { setLoading(false); }
    }

    async function toggleRead(id: string, currentStatus: boolean) {
        try {
            const res = await fetch("/api/admin/contacts", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, is_read: !currentStatus }),
            });
            if (res.ok) {
                setContacts(prev => prev.map(c => c.id === id ? { ...c, is_read: !currentStatus } : c));
                toast.success(!currentStatus ? "Marked as read" : "Marked as unread");
            }
        } catch { toast.error("Error updating"); }
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this message permanently?")) return;
        try {
            const res = await fetch(`/api/admin/contacts?id=${id}`, { method: "DELETE" });
            if (res.ok) {
                setContacts(prev => prev.filter(c => c.id !== id));
                toast.success("Deleted");
            }
        } catch { toast.error("Error deleting"); }
    }

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

    const unreadCount = contacts.filter(c => !c.is_read).length;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Contact Messages</h1>
                <p className="text-muted-foreground">
                    {contacts.length} total · {unreadCount > 0 ? <span className="text-orange-500 font-medium">{unreadCount} unread</span> : "All read"}
                </p>
            </div>

            {contacts.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Mail className="h-12 w-12 mb-4 opacity-50" />
                        <p>No contact messages yet.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {contacts.map((contact) => (
                        <Card key={contact.id} className={!contact.is_read ? "border-l-4 border-l-orange-500" : ""}>
                            <CardHeader className="flex flex-row items-start justify-between pb-2">
                                <div className="space-y-1">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        {contact.name}
                                        {!contact.is_read && <Badge variant="destructive" className="text-xs">New</Badge>}
                                    </CardTitle>
                                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                        <span>{contact.email}</span>
                                        {contact.phone && <span>· {contact.phone}</span>}
                                        <span>· {new Date(contact.created_at).toLocaleDateString("en-US", {
                                            year: "numeric", month: "short", day: "numeric",
                                            hour: "2-digit", minute: "2-digit"
                                        })}</span>
                                    </div>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => toggleRead(contact.id, contact.is_read)}
                                        title={contact.is_read ? "Mark as unread" : "Mark as read"}
                                    >
                                        {contact.is_read ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="text-red-500"
                                        onClick={() => handleDelete(contact.id)}
                                    >
                                        <Trash className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap">
                                    {contact.message}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
