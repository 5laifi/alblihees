"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Image as ImageIcon, Users, Activity, Mail, CheckCircle, AlertCircle } from "lucide-react";

interface DashboardStats {
    services: number;
    mediaItems: number;
    partners: number;
    contacts: number;
    unreadContacts: number;
}

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [dbStatus, setDbStatus] = useState<"checking" | "connected" | "error">("checking");

    useEffect(() => {
        async function fetchStats() {
            try {
                const [servicesRes, mediaRes, partnersRes, contactsRes] = await Promise.all([
                    fetch("/api/admin/services"),
                    fetch("/api/admin/media"),
                    fetch("/api/admin/partners"),
                    fetch("/api/admin/contacts"),
                ]);

                const services = await servicesRes.json();
                const media = await mediaRes.json();
                const partners = await partnersRes.json();
                const contacts = await contactsRes.json();

                setStats({
                    services: Array.isArray(services) ? services.length : 0,
                    mediaItems: Array.isArray(media) ? media.length : 0,
                    partners: Array.isArray(partners) ? partners.length : 0,
                    contacts: Array.isArray(contacts) ? contacts.length : 0,
                    unreadContacts: Array.isArray(contacts) ? contacts.filter((c: { is_read: boolean }) => !c.is_read).length : 0,
                });
                setDbStatus("connected");
            } catch {
                setDbStatus("error");
            }
        }
        fetchStats();
    }, []);

    const statCards = [
        { label: "Services", value: stats?.services ?? "—", icon: FileText, color: "text-blue-500" },
        { label: "Media Items", value: stats?.mediaItems ?? "—", icon: ImageIcon, color: "text-purple-500" },
        { label: "Partners", value: stats?.partners ?? "—", icon: Users, color: "text-green-500" },
        { label: "Contact Messages", value: stats?.contacts ?? "—", icon: Mail, color: "text-orange-500" },
    ];

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Dashboard Overview</h1>
            <p className="text-muted-foreground">Welcome back, Admin. Here&apos;s what&apos;s happening on your site.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat) => (
                    <Card key={stat.label} className="border-t-4 border-t-primary/20 hover:border-t-primary transition-all">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {stat.label}
                            </CardTitle>
                            <stat.icon className={`h-4 w-4 ${stat.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{String(stat.value)}</div>
                            {stat.label === "Contact Messages" && stats && stats.unreadContacts > 0 && (
                                <p className="text-xs text-orange-500 font-medium mt-1">
                                    {stats.unreadContacts} unread
                                </p>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Contact Submissions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats && stats.contacts > 0 ? (
                            <p className="text-sm text-muted-foreground">
                                You have <span className="font-bold text-foreground">{stats.contacts}</span> total messages
                                {stats.unreadContacts > 0 && (
                                    <>, <span className="font-bold text-orange-500">{stats.unreadContacts} unread</span></>
                                )}
                                . Check the Contact Messages section for details.
                            </p>
                        ) : (
                            <p className="text-sm text-muted-foreground">No contact submissions yet.</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>System Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span>Database Connection</span>
                                {dbStatus === "checking" && (
                                    <span className="text-yellow-500 font-medium flex items-center gap-1">
                                        <Activity className="h-3 w-3 animate-spin" /> Checking...
                                    </span>
                                )}
                                {dbStatus === "connected" && (
                                    <span className="text-green-500 font-medium flex items-center gap-1">
                                        <CheckCircle className="h-3 w-3" /> Connected
                                    </span>
                                )}
                                {dbStatus === "error" && (
                                    <span className="text-red-500 font-medium flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" /> Error
                                    </span>
                                )}
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Authentication</span>
                                <span className="text-green-500 font-medium flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" /> Protected
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
