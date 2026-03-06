"use client";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Settings, Save, Loader2, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export default function SettingsPage() {
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [s, setS] = useState({
        darkMode: true, alarmSounds: false, autoReconnect: true,
        chartAnimations: false, dataRetention: "30",
        refreshRate: "1000", tempUnit: "celsius", timezone: "Asia/Kolkata",
    });

    // Load from backend on mount
    useEffect(() => {
        async function load() {
            try {
                const res = await fetch(`${BACKEND}/api/settings`);
                if (!res.ok) throw new Error("Failed");
                const data = await res.json();
                setS({
                    darkMode: data.darkMode ?? true,
                    alarmSounds: data.alarmSounds ?? false,
                    autoReconnect: data.autoReconnect ?? true,
                    chartAnimations: data.chartAnimations ?? false,
                    dataRetention: data.dataRetention || "30",
                    refreshRate: data.refreshRate || "1000",
                    tempUnit: data.tempUnit || "celsius",
                    timezone: data.timezone || "Asia/Kolkata",
                });
            } catch {
                setError("Backend not reachable – showing defaults");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    async function handleSave() {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`${BACKEND}/api/settings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(s),
            });
            if (!res.ok) throw new Error("Save failed");
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch {
            setError("Could not save – is the backend running?");
        } finally {
            setSaving(false);
        }
    }

    function toggle(key) { setS((p) => ({ ...p, [key]: !p[key] })); }
    function set(key, val) { setS((p) => ({ ...p, [key]: val })); }

    return (
        <div className="flex flex-col h-full">
            <header className="flex items-center gap-2 px-3 py-2.5 border-b border-border shrink-0">
                <SidebarTrigger className="-ml-1 shrink-0" />
                <Separator orientation="vertical" className="h-4" />
                <Settings className="size-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                    <h1 className="text-sm font-semibold">Settings</h1>
                    <p className="text-xs text-muted-foreground hidden sm:block">Application preferences</p>
                </div>
                {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            </header>

            <div className="flex-1 overflow-auto p-4">
                <div className="max-w-2xl mx-auto space-y-4">
                    {saved && (
                        <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                            <AlertDescription>✅ Settings saved to database.</AlertDescription>
                        </Alert>
                    )}
                    {error && (
                        <Alert className="border-yellow-500/30 bg-yellow-500/10 text-yellow-400">
                            <AlertDescription>⚠️ {error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Appearance */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Appearance</CardTitle>
                            <CardDescription className="text-xs">Display and visual preferences</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[
                                { key: "darkMode", label: "Dark Mode", desc: "Use dark theme throughout" },
                                { key: "chartAnimations", label: "Chart Animations", desc: "Smooth chart transitions" },
                            ].map(({ key, label, desc }) => (
                                <div key={key} className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium">{label}</p>
                                        <p className="text-xs text-muted-foreground">{desc}</p>
                                    </div>
                                    <Switch checked={s[key]} onCheckedChange={() => toggle(key)} disabled={loading} />
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Notifications */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Notifications</CardTitle>
                            <CardDescription className="text-xs">Alert and sound preferences</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[
                                { key: "alarmSounds", label: "Alarm Sounds", desc: "Play audio on alarm events" },
                                { key: "autoReconnect", label: "Auto Reconnect", desc: "Reconnect on disconnect" },
                            ].map(({ key, label, desc }) => (
                                <div key={key} className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium">{label}</p>
                                        <p className="text-xs text-muted-foreground">{desc}</p>
                                    </div>
                                    <Switch checked={s[key]} onCheckedChange={() => toggle(key)} disabled={loading} />
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Data */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Data & Performance</CardTitle>
                            <CardDescription className="text-xs">Data handling preferences</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Data Retention (days)</Label>
                                <Select value={s.dataRetention} onValueChange={(v) => set("dataRetention", v)} disabled={loading}>
                                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="7">7 days</SelectItem>
                                        <SelectItem value="30">30 days</SelectItem>
                                        <SelectItem value="90">90 days</SelectItem>
                                        <SelectItem value="365">1 year</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Dashboard Refresh Rate</Label>
                                <Select value={s.refreshRate} onValueChange={(v) => set("refreshRate", v)} disabled={loading}>
                                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1000">1 second</SelectItem>
                                        <SelectItem value="2000">2 seconds</SelectItem>
                                        <SelectItem value="5000">5 seconds</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Timezone</Label>
                                <Select value={s.timezone} onValueChange={(v) => set("timezone", v)} disabled={loading}>
                                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                                        <SelectItem value="UTC">UTC</SelectItem>
                                        <SelectItem value="Europe/London">Europe/London</SelectItem>
                                        <SelectItem value="America/New_York">America/New_York</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => window.location.reload()} className="gap-2">
                            <RefreshCw className="size-4" />Reload
                        </Button>
                        <Button onClick={handleSave} disabled={loading || saving} className="gap-2">
                            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                            {saving ? "Saving…" : "Save to Database"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
