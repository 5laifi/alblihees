"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Lock, Mail } from "lucide-react";

export default function AdminLoginPage() {
    const t = useTranslations("Common");
    const router = useRouter();

    // Auth State
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Forgot Password State
    const [isForgotMode, setIsForgotMode] = useState(false);
    const [email, setEmail] = useState("");
    const [resetSent, setResetSent] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });

            if (res.ok) {
                router.push("/admin/dashboard");
                router.refresh();
            } else {
                setError("Invalid password");
            }
        } catch (err) {
            setError("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();
            if (res.ok) {
                setResetSent(true);
            } else {
                setError(data.error || "Failed to send reset email");
            }
        } catch (err) {
            setError("Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    if (isForgotMode) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
                <Card className="w-full max-w-md shadow-2xl border-t-4 border-t-primary">
                    <CardHeader className="text-center space-y-4">
                        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                            <Mail className="w-6 h-6 text-primary" />
                        </div>
                        <CardTitle className="text-2xl">Reset Password</CardTitle>
                        <CardDescription>
                            Enter the admin email address to receive a secure reset link.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {resetSent ? (
                            <div className="space-y-6 text-center">
                                <p className="text-sm text-muted-foreground">
                                    If the email matches our records, a password reset link has been sent. Please check your inbox (and spam folder). The link is valid for 15 minutes.
                                </p>
                                <Button className="w-full" onClick={() => setIsForgotMode(false)}>
                                    Return to Login
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleForgotPassword} className="space-y-4">
                                <div className="space-y-2">
                                    <Input
                                        type="email"
                                        placeholder="Admin Email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="h-12 text-lg"
                                        required
                                        autoFocus
                                    />
                                    {error && <p className="text-sm text-destructive font-medium">{error}</p>}
                                </div>
                                <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
                                    {loading ? "Sending..." : "Send Reset Link"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="link"
                                    className="w-full text-muted-foreground"
                                    onClick={() => setIsForgotMode(false)}
                                    disabled={loading}
                                >
                                    Back to Login
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
            <Card className="w-full max-w-md shadow-2xl border-t-4 border-t-primary">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <Lock className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Admin Access</CardTitle>
                    <CardDescription>
                        Enter your secure password to access the dashboard
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-12 text-lg"
                                autoFocus
                            />
                            {error && <p className="text-sm text-destructive font-medium">{error}</p>}
                        </div>
                        <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
                            {loading ? "Authenticating..." : "Enter Dashboard"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="justify-center border-t py-4 mt-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => setIsForgotMode(true)}
                    >
                        Forgot Password?
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
