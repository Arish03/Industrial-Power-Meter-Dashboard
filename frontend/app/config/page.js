"use client";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings2, Save, Loader2, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export default function ConfigPage() {
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [form, setForm] = useState({
        brokerUrl: "", siteId: "", assetId: "",
        phases: "3", nominalV: "230", nominalFreq: "50", telemetryInterval: "1000",
    });

    // Load from backend on mount
    useEffect(() => {
        async function load() {
            try {
                const res = await fetch(`${BACKEND}/api/config`);
                if (!res.ok) throw new Error("Failed to load config");
                const data = await res.json();
                setForm({
                    brokerUrl: data.brokerUrl || "mqtt://localhost:1883",
                    siteId: data.siteId || "site01",
                    assetId: data.assetId || "pmu01",
                    phases: data.phases || "3",
                    nominalV: data.nominalV || "230",
                    nominalFreq: data.nominalFreq || "50",
                    telemetryInterval: data.telemetryInterval || "1000",
                });
            } catch (e) {
                setError("Backend not reachable – showing defaults");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`${BACKEND}/api/config`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error("Save failed");
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (e) {
            setError("Could not save – is the backend running?");
        } finally {
            setSaving(false);
        }
    }

    function onChange(key, val) { setForm((p) => ({ ...p, [key]: val })); }

    return (
        <div className="flex flex-col h-full">
            <header className="flex items-center gap-2 px-3 py-2.5 border-b border-border shrink-0">
                <SidebarTrigger className="-ml-1 shrink-0" />
                <Separator orientation="vertical" className="h-4" />
                <Settings2 className="size-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                    <h1 className="text-sm font-semibold">Configuration</h1>
                    <p className="text-xs text-muted-foreground hidden sm:block">Device and broker settings</p>
                </div>
                {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            </header>

            <div className="flex-1 overflow-auto p-4">
                <div className="max-w-2xl mx-auto space-y-4">
                    {saved && (
                        <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                            <AlertDescription>✅ Configuration saved to database.</AlertDescription>
                        </Alert>
                    )}
                    {error && (
                        <Alert className="border-yellow-500/30 bg-yellow-500/10 text-yellow-400">
                            <AlertDescription>⚠️ {error}</AlertDescription>
                        </Alert>
                    )}

                    <form onSubmit={handleSave} className="space-y-4">
                        {/* MQTT Broker */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">MQTT Broker</CardTitle>
                                <CardDescription className="text-xs">Connection to your Azure VM broker</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Broker URL</Label>
                                    <Input value={form.brokerUrl} onChange={(e) => onChange("brokerUrl", e.target.value)}
                                        placeholder="mqtt://ip:1883" className="font-mono text-sm" disabled={loading} />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Device Identity */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Device Identity</CardTitle>
                                <CardDescription className="text-xs">Site and asset identifiers</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Site ID</Label>
                                    <Input value={form.siteId} onChange={(e) => onChange("siteId", e.target.value)}
                                        placeholder="site01" className="font-mono text-sm" disabled={loading} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Asset ID</Label>
                                    <Input value={form.assetId} onChange={(e) => onChange("assetId", e.target.value)}
                                        placeholder="pmu01" className="font-mono text-sm" disabled={loading} />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Electrical Parameters */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Electrical Parameters</CardTitle>
                                <CardDescription className="text-xs">Nominal values and phase configuration</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Phases</Label>
                                    <Select value={form.phases} onValueChange={(v) => onChange("phases", v)} disabled={loading}>
                                        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">1-Phase</SelectItem>
                                            <SelectItem value="3">3-Phase</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Nominal Voltage (V)</Label>
                                    <Input value={form.nominalV} onChange={(e) => onChange("nominalV", e.target.value)}
                                        className="font-mono text-sm" disabled={loading} />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Nominal Frequency (Hz)</Label>
                                    <Input value={form.nominalFreq} onChange={(e) => onChange("nominalFreq", e.target.value)}
                                        className="font-mono text-sm" disabled={loading} />
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => window.location.reload()} className="gap-2">
                                <RefreshCw className="size-4" />Reload
                            </Button>
                            <Button type="submit" disabled={loading || saving} className="gap-2">
                                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                                {saving ? "Saving…" : "Save to Database"}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
