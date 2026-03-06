"use client"

import { useEffect, useState } from "react"
import { Save, AlertTriangle, Gauge, Zap, Activity, Waves } from "lucide-react"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { fetchConfig, saveConfig } from "@/lib/api"

export default function ConfigPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [config, setConfig] = useState({
        brokerUrl: "",
        nominalV: 230,
        nominalFreq: 50,
        // Alarm Thresholds (Pairs)
        warn_pf: 0.90, crit_pf: 0.85,
        warn_thd_v: 5.0, crit_thd_v: 8.0,
        warn_v_dev_pct: 10.0, crit_v_dev_pct: 15.0,
        warn_i_a: 40.0, crit_i_a: 50.0,
        warn_freq_dev: 0.5, crit_freq_dev: 1.0
    })

    useEffect(() => {
        fetchConfig()
            .then(data => {
                if (data) {
                    setConfig({
                        brokerUrl: data.brokerUrl || "mqtt://localhost:1883",
                        nominalV: data.nominalV || 230,
                        nominalFreq: data.nominalFreq || 50,
                        warn_pf: data.warn_pf ?? 0.90,
                        crit_pf: data.crit_pf ?? 0.85,
                        warn_thd_v: data.warn_thd_v ?? 5.0,
                        crit_thd_v: data.crit_thd_v ?? 8.0,
                        warn_v_dev_pct: data.warn_v_dev_pct ?? 10.0,
                        crit_v_dev_pct: data.crit_v_dev_pct ?? 15.0,
                        warn_i_a: data.warn_i_a ?? 40.0,
                        crit_i_a: data.crit_i_a ?? 50.0,
                        warn_freq_dev: data.warn_freq_dev ?? 0.5,
                        crit_freq_dev: data.crit_freq_dev ?? 1.0
                    })
                }
            })
            .catch(err => console.error("Error loading config:", err))
            .finally(() => setLoading(false))
    }, [])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target
        setConfig(prev => ({
            ...prev,
            [name]: type === "number" ? Number(value) : value
        }))
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            await saveConfig(config)
            alert("Configuration saved successfully!")
        } catch (err) {
            alert("Failed to save configuration.")
            console.error(err)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse text-lg">Loading system configuration...</div>

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">System Configuration</h2>
                    <p className="text-muted-foreground">Manage device integration and automated alarm thresholds.</p>
                </div>
                <Button onClick={handleSave} disabled={saving} size="lg" className="px-8 shadow-md">
                    {saving && <span className="animate-spin mr-2">◓</span>}
                    <Save className="mr-2 h-5 w-5" />
                    Apply Changes
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── Left Column: System Settings ── */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                                <Waves className="h-4 w-4 text-blue-500" /> MQTT Connection
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="brokerUrl" className="text-xs">Broker URL</Label>
                                <Input id="brokerUrl" name="brokerUrl" value={config.brokerUrl} onChange={handleChange} className="h-8" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                                <Gauge className="h-4 w-4 text-orange-500" /> Electrical Nominals
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="nominalV" className="text-xs">Phase V</Label>
                                    <Input id="nominalV" name="nominalV" type="number" value={config.nominalV} onChange={handleChange} className="h-8" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="nominalFreq" className="text-xs">Freq (Hz)</Label>
                                    <Input id="nominalFreq" name="nominalFreq" type="number" value={config.nominalFreq} onChange={handleChange} className="h-8" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Right Column: Alarm Thresholds ── */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-orange-500/20 shadow-md">
                        <CardHeader className="pb-4 border-b bg-muted/30">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-orange-600 uppercase tracking-wider text-sm font-bold">
                                        <AlertTriangle className="h-5 w-5" /> Alarm Thresholds
                                    </CardTitle>
                                    <CardDescription className="text-xs mt-1">Configure warning and critical levels for backend alerts.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Power Factor */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold flex items-center gap-1.5 uppercase tracking-tighter text-muted-foreground">
                                        <Zap className="h-3.5 w-3.5 text-yellow-500" /> Power Factor
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="warn_pf" className="text-[10px] text-orange-500 font-bold">WARNING</Label>
                                            <Input id="warn_pf" name="warn_pf" type="number" step="0.01" value={config.warn_pf} onChange={handleChange} className="h-9 border-orange-200" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="crit_pf" className="text-[10px] text-red-600 font-bold">CRITICAL</Label>
                                            <Input id="crit_pf" name="crit_pf" type="number" step="0.01" value={config.crit_pf} onChange={handleChange} className="h-9 border-red-200" />
                                        </div>
                                    </div>
                                </div>

                                {/* THD-V */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold flex items-center gap-1.5 uppercase tracking-tighter text-muted-foreground">
                                        <Waves className="h-3.5 w-3.5 text-cyan-500" /> Max THD-V (%)
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="warn_thd_v" className="text-[10px] text-orange-500 font-bold">WARNING</Label>
                                            <Input id="warn_thd_v" name="warn_thd_v" type="number" step="0.1" value={config.warn_thd_v} onChange={handleChange} className="h-9 border-orange-200" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="crit_thd_v" className="text-[10px] text-red-600 font-bold">CRITICAL</Label>
                                            <Input id="crit_thd_v" name="crit_thd_v" type="number" step="0.1" value={config.crit_thd_v} onChange={handleChange} className="h-9 border-red-200" />
                                        </div>
                                    </div>
                                </div>

                                {/* Voltage Deviation */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold flex items-center gap-1.5 uppercase tracking-tighter text-muted-foreground">
                                        <Gauge className="h-3.5 w-3.5 text-amber-500" /> Voltage Tol. (±%)
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="warn_v_dev_pct" className="text-[10px] text-orange-500 font-bold">WARNING</Label>
                                            <Input id="warn_v_dev_pct" name="warn_v_dev_pct" type="number" step="1" value={config.warn_v_dev_pct} onChange={handleChange} className="h-9 border-orange-200" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="crit_v_dev_pct" className="text-[10px] text-red-600 font-bold">CRITICAL</Label>
                                            <Input id="crit_v_dev_pct" name="crit_v_dev_pct" type="number" step="1" value={config.crit_v_dev_pct} onChange={handleChange} className="h-9 border-red-200" />
                                        </div>
                                    </div>
                                </div>

                                {/* Overcurrent */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold flex items-center gap-1.5 uppercase tracking-tighter text-muted-foreground">
                                        <Zap className="h-3.5 w-3.5 text-red-500" /> Overcurrent (Amps)
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="warn_i_a" className="text-[10px] text-orange-500 font-bold">WARNING</Label>
                                            <Input id="warn_i_a" name="warn_i_a" type="number" step="1" value={config.warn_i_a} onChange={handleChange} className="h-9 border-orange-200" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="crit_i_a" className="text-[10px] text-red-600 font-bold">CRITICAL</Label>
                                            <Input id="crit_i_a" name="crit_i_a" type="number" step="1" value={config.crit_i_a} onChange={handleChange} className="h-9 border-red-200" />
                                        </div>
                                    </div>
                                </div>

                                {/* Frequency Deviation */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold flex items-center gap-1.5 uppercase tracking-tighter text-muted-foreground">
                                        <Activity className="h-3.5 w-3.5 text-blue-500" /> Freq Tol. (±Hz)
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="warn_freq_dev" className="text-[10px] text-orange-500 font-bold">WARNING</Label>
                                            <Input id="warn_freq_dev" name="warn_freq_dev" type="number" step="0.01" value={config.warn_freq_dev} onChange={handleChange} className="h-9 border-orange-200" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="crit_freq_dev" className="text-[10px] text-red-600 font-bold">CRITICAL</Label>
                                            <Input id="crit_freq_dev" name="crit_freq_dev" type="number" step="0.01" value={config.crit_freq_dev} onChange={handleChange} className="h-9 border-red-200" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="bg-orange-50/10 dark:bg-orange-950/20 border-t py-3">
                            <p className="text-[10px] text-muted-foreground italic leading-tight">
                                <strong>System Logic:</strong> Backend evaluates telemetry every second. All values are pulled from the database on every backend restart and periodically refreshed.
                            </p>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    )
}
