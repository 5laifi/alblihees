"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    Loader2,
    Trash,
    Eye,
    EyeOff,
    Mail,
    Phone,
    Clock,
    User,
    ChevronDown,
    Inbox,
    CheckCheck,
    Filter,
} from "lucide-react";
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

type FilterType = "all" | "unread" | "read";

export default function AdminContactsPage() {
    const [contacts, setContacts] = useState<ContactSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterType>("all");
    const [expandedItems, setExpandedItems] = useState<string[]>([]);

    useEffect(() => {
        fetchContacts();
    }, []);

    async function fetchContacts() {
        try {
            const res = await fetch("/api/admin/contacts");
            const data = await res.json();
            if (Array.isArray(data)) setContacts(data);
        } catch {
            toast.error("Failed to load contacts");
        } finally {
            setLoading(false);
        }
    }

    async function toggleRead(id: string, currentStatus: boolean) {
        try {
            const res = await fetch("/api/admin/contacts", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, is_read: !currentStatus }),
            });
            if (res.ok) {
                setContacts((prev) =>
                    prev.map((c) =>
                        c.id === id ? { ...c, is_read: !currentStatus } : c
                    )
                );
                toast.success(
                    !currentStatus ? "Marked as read" : "Marked as unread"
                );
            }
        } catch {
            toast.error("Error updating");
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this message permanently?")) return;
        try {
            const res = await fetch(`/api/admin/contacts?id=${id}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setContacts((prev) => prev.filter((c) => c.id !== id));
                toast.success("Deleted");
            }
        } catch {
            toast.error("Error deleting");
        }
    }

    async function markAllRead() {
        const unreadContacts = contacts.filter((c) => !c.is_read);
        for (const contact of unreadContacts) {
            await toggleRead(contact.id, false);
        }
    }

    const filteredContacts = contacts.filter((c) => {
        if (filter === "unread") return !c.is_read;
        if (filter === "read") return c.is_read;
        return true;
    });

    const unreadCount = contacts.filter((c) => !c.is_read).length;
    const readCount = contacts.filter((c) => c.is_read).length;

    function formatDate(dateStr: string) {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (diffHours < 1) return "Just now";
        if (diffHours < 24)
            return `${Math.floor(diffHours)}h ago`;
        if (diffDays < 7)
            return `${Math.floor(diffDays)}d ago`;

        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }

    function formatFullDate(dateStr: string) {
        return new Date(dateStr).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    if (loading)
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Contact Submissions</h1>
                    <p className="text-muted-foreground mt-1">
                        {contacts.length} total messages
                        {unreadCount > 0 && (
                            <span className="text-orange-500 font-medium">
                                {" "}· {unreadCount} unread
                            </span>
                        )}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={markAllRead}
                        className="shrink-0"
                    >
                        <CheckCheck className="h-4 w-4 mr-2" />
                        Mark all as read
                    </Button>
                )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
                    <button
                        onClick={() => setFilter("all")}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === "all"
                                ? "bg-background shadow-sm text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        All ({contacts.length})
                    </button>
                    <button
                        onClick={() => setFilter("unread")}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === "unread"
                                ? "bg-background shadow-sm text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        Unread ({unreadCount})
                    </button>
                    <button
                        onClick={() => setFilter("read")}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === "read"
                                ? "bg-background shadow-sm text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        Read ({readCount})
                    </button>
                </div>
            </div>

            {/* Contact List */}
            {filteredContacts.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <Inbox className="h-14 w-14 mb-4 opacity-40" />
                        <p className="text-lg font-medium">No messages</p>
                        <p className="text-sm mt-1">
                            {filter !== "all"
                                ? `No ${filter} messages found.`
                                : "No contact submissions yet."}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card className="overflow-hidden">
                    <Accordion
                        type="multiple"
                        value={expandedItems}
                        onValueChange={setExpandedItems}
                    >
                        {filteredContacts.map((contact, index) => (
                            <AccordionItem
                                key={contact.id}
                                value={contact.id}
                                className={`${index !== filteredContacts.length - 1
                                        ? "border-b"
                                        : ""
                                    } ${!contact.is_read
                                        ? "bg-orange-500/5"
                                        : ""
                                    }`}
                            >
                                <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 transition-colors [&[data-state=open]>div>.chevron-icon]:rotate-180">
                                    <div className="flex items-center justify-between w-full pr-2">
                                        <div className="flex items-center gap-4 min-w-0">
                                            {/* Unread indicator */}
                                            <div
                                                className={`w-2.5 h-2.5 rounded-full shrink-0 ${!contact.is_read
                                                        ? "bg-orange-500"
                                                        : "bg-transparent"
                                                    }`}
                                            />

                                            {/* Avatar */}
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                <User className="h-5 w-5 text-primary" />
                                            </div>

                                            {/* Name and preview */}
                                            <div className="text-left min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`text-sm ${!contact.is_read
                                                                ? "font-bold"
                                                                : "font-medium"
                                                            }`}
                                                    >
                                                        {contact.name}
                                                    </span>
                                                    {!contact.is_read && (
                                                        <Badge
                                                            variant="destructive"
                                                            className="text-[10px] px-1.5 py-0"
                                                        >
                                                            NEW
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground truncate max-w-[300px] sm:max-w-[400px]">
                                                    {contact.message}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Right side: date */}
                                        <div className="flex items-center gap-3 shrink-0 ml-4">
                                            <span className="text-xs text-muted-foreground hidden sm:block">
                                                {formatDate(
                                                    contact.created_at
                                                )}
                                            </span>
                                            <ChevronDown className="h-4 w-4 text-muted-foreground chevron-icon transition-transform duration-200" />
                                        </div>
                                    </div>
                                </AccordionTrigger>

                                <AccordionContent className="px-5 pb-5">
                                    <div className="ml-[4.25rem] space-y-4">
                                        {/* Contact Info Grid */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Mail className="h-4 w-4 text-muted-foreground" />
                                                <a
                                                    href={`mailto:${contact.email}`}
                                                    className="text-[#78B7D0] hover:underline"
                                                >
                                                    {contact.email}
                                                </a>
                                            </div>
                                            {contact.phone && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                                    <a
                                                        href={`tel:${contact.phone}`}
                                                        className="text-[#78B7D0] hover:underline dir-ltr"
                                                    >
                                                        {contact.phone}
                                                    </a>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Clock className="h-4 w-4" />
                                                <span>
                                                    {formatFullDate(
                                                        contact.created_at
                                                    )}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Message */}
                                        <div className="bg-muted/40 rounded-xl p-4 text-sm whitespace-pre-wrap leading-relaxed border border-border/50">
                                            {contact.message}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 pt-1">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleRead(
                                                        contact.id,
                                                        contact.is_read
                                                    );
                                                }}
                                            >
                                                {contact.is_read ? (
                                                    <>
                                                        <EyeOff className="h-3.5 w-3.5 mr-1.5" />
                                                        Mark as unread
                                                    </>
                                                ) : (
                                                    <>
                                                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                                                        Mark as read
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.location.href = `mailto:${contact.email}`;
                                                }}
                                            >
                                                <Mail className="h-3.5 w-3.5 mr-1.5" />
                                                Reply
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 ml-auto"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(contact.id);
                                                }}
                                            >
                                                <Trash className="h-3.5 w-3.5 mr-1.5" />
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </Card>
            )}
        </div>
    );
}
