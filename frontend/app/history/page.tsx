"use client"

import { useEffect, useState, useCallback } from "react"
import {
    Download, RefreshCw, Clock, Zap, Activity, Gauge, Waves, Search,
    ChevronDown, AlertTriangle, TrendingUp, TrendingDown, Minus
} from "lucide-react"

import { fetchDevices, fetchHistoryTelemetry, fetchHistorySummary, fetchHistoryAlarms, getExportUrl } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    ResponsiveContainer, AreaChart, Area, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine
} from "recharts"

// ── Constants ─────────────────────────────────────────────────────────────────
const TIME_PRESETS = [
    { label: "15m", ms: 15 * 60 * 1000 },
    { label: "1h", ms: 60 * 60 * 1000 },
    { label: "24h", ms: 24 * 60 * 60 * 1000 },
    { label: "7d", ms: 7 * 24 * 60 * 60 * 1000 },
    { label: "30d", ms: 30 * 24 * 60 * 60 * 1000 },
]

const METER_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"]

const formatTime = (tick: number, rangeMs: number) => {
    const d = new Date(tick)
    if (rangeMs <= 60 * 60 * 1000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
    if (rangeMs <= 24 * 60 * 60 * 1000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
    return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
}

const fmt = (v: number | null | undefined, decimals = 2) => (v != null ? Number(v).toFixed(decimals) : "--")

// ── Summary Card ──────────────────────────────────────────────────────────────
function SummaryCard({ title, unit, avg, min, max, icon, tooltip }: {
    title: string, unit: string, avg?: number | null, min?: number | null, max?: number | null,
    icon: React.ReactNode, tooltip?: string
}) {
    return (
        <Card className="relative group">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                        {icon} {title}
                    </CardTitle>
                    {tooltip && (
                        <span className="text-xs text-muted-foreground/60 hidden group-hover:inline" title={tooltip}>ⓘ</span>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-1">
                <div className="text-2xl font-bold tabular-nums">{fmt(avg)} <span className="text-sm font-normal text-muted-foreground">{unit}</span></div>
                <div className="flex gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5"><TrendingDown className="h-3 w-3 text-blue-400" /> {fmt(min)}</span>
                    <span className="flex items-center gap-0.5"><Minus className="h-3 w-3" /> avg</span>
                    <span className="flex items-center gap-0.5"><TrendingUp className="h-3 w-3 text-red-400" /> {fmt(max)}</span>
                </div>
            </CardContent>
        </Card>
    )
}

export default function HistoryPage() {
    // Controls state
    const [sites, setSites] = useState<Record<string, any[]>>({})
    const [selectedSite, setSelectedSite] = useState("")
    const [selectedAsset, setSelectedAsset] = useState<string | null>(null)  // null = All Meters
    const [rangeMs, setRangeMs] = useState(TIME_PRESETS[2].ms)
    const [activePreset, setActivePreset] = useState("24h")

    // Data state
    const [trendData, setTrendData] = useState<any[]>([])
    const [meterIds, setMeterIds] = useState<string[]>([])
    const [isMultiMode, setIsMultiMode] = useState(false)
    const [summary, setSummary] = useState<any>(null)
    const [alarms, setAlarms] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [lastFetch, setLastFetch] = useState<Date | null>(null)

    // Load devices on mount
    useEffect(() => {
        fetchDevices()
            .then(data => {
                if (data) {
                    setSites(data)
                    const firstSite = Object.keys(data)[0]
                    if (firstSite) {
                        setSelectedSite(firstSite)
                        setSelectedAsset(null) // Default to All Meters
                    }
                }
            })
            .catch(err => console.error("History: error loading devices", err))
    }, [])

    // Fetch data when filters change
    const loadHistory = useCallback(async () => {
        if (!selectedSite) return
        setLoading(true)

        const end = Date.now()
        const start = end - rangeMs

        try {
            const [telemetryRes, sum, alarmData] = await Promise.all([
                fetchHistoryTelemetry(selectedSite, selectedAsset, start, end).catch(() => ({ mode: "single", data: [] })),
                fetchHistorySummary(selectedSite, selectedAsset, start, end).catch(() => null),
                fetchHistoryAlarms(selectedSite, selectedAsset, start, end).catch(() => []),
            ])

            if (telemetryRes?.mode === "multi") {
                setIsMultiMode(true)
                setMeterIds(telemetryRes.meterIds || [])
                setTrendData(Array.isArray(telemetryRes.data) ? telemetryRes.data : [])
            } else {
                setIsMultiMode(false)
                setMeterIds([])
                setTrendData(Array.isArray(telemetryRes?.data) ? telemetryRes.data : (Array.isArray(telemetryRes) ? telemetryRes : []))
            }

            setSummary(sum)
            setAlarms(Array.isArray(alarmData) ? alarmData : [])
            setLastFetch(new Date())
        } catch (err) {
            console.error("History fetch error", err)
        } finally {
            setLoading(false)
        }
    }, [selectedSite, selectedAsset, rangeMs])

    useEffect(() => { loadHistory() }, [loadHistory])

    const siteKeys = Object.keys(sites)
    const assetsForSite = sites[selectedSite] || []
    const end = Date.now()
    const start = end - rangeMs

    // ── Tooltip Style ─────────────────────────────────────────────────────────
    const tooltipStyle = { borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }

    return (
        <div className="flex-1 space-y-6">
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">History & Analytics</h2>
                    <p className="text-muted-foreground">
                        SCADA-style historical trend analysis and alarm investigation.
                        {isMultiMode && <Badge variant="outline" className="ml-2 text-xs">Comparing {meterIds.length} meters</Badge>}
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {lastFetch && <span>Last updated: {lastFetch.toLocaleTimeString()}</span>}
                    <button onClick={loadHistory} disabled={loading} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border bg-background hover:bg-accent text-sm disabled:opacity-50">
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
                    </button>
                </div>
            </div>

            {/* ── Controls Bar ────────────────────────────────────────────── */}
            <Card>
                <CardContent className="pt-4 pb-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-muted-foreground">Site</label>
                            <select
                                value={selectedSite}
                                onChange={e => { setSelectedSite(e.target.value); setSelectedAsset(null) }}
                                className="h-9 px-3 rounded-md border bg-background text-sm min-w-[120px]"
                            >
                                {siteKeys.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-muted-foreground">Meter</label>
                            <select
                                value={selectedAsset || "__all__"}
                                onChange={e => setSelectedAsset(e.target.value === "__all__" ? null : e.target.value)}
                                className="h-9 px-3 rounded-md border bg-background text-sm min-w-[140px]"
                            >
                                <option value="__all__">All Meters</option>
                                {assetsForSite.map((a: any) => <option key={a.asset_id} value={a.asset_id}>{a.asset_id}</option>)}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-muted-foreground">Time Range</label>
                            <div className="flex gap-1">
                                {TIME_PRESETS.map(p => (
                                    <button key={p.label} onClick={() => { setRangeMs(p.ms); setActivePreset(p.label) }}
                                        className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${activePreset === p.label ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent"}`}>
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1" />

                        {selectedAsset && (
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-muted-foreground invisible">Export</label>
                                <a href={getExportUrl(selectedSite, selectedAsset, start, end)} download
                                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md border bg-background hover:bg-accent text-sm">
                                    <Download className="h-3.5 w-3.5" /> Export CSV
                                </a>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* ── Summary Strip ───────────────────────────────────────────── */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <SummaryCard title="Active Power" unit="kW" avg={summary?.kw?.avg} min={summary?.kw?.min} max={summary?.kw?.max}
                    icon={<Zap className="h-3.5 w-3.5" />} tooltip="Average, minimum, and maximum active power over the selected period." />
                <SummaryCard title="Power Factor" unit="PF" avg={summary?.pf?.avg} min={summary?.pf?.min} max={summary?.pf?.max}
                    icon={<Gauge className="h-3.5 w-3.5" />} tooltip="PF closer to 1.0 is ideal. Low PF means reactive power losses." />
                <SummaryCard title="THD Voltage" unit="%" avg={summary?.thd_v?.avg} min={null} max={summary?.thd_v?.max}
                    icon={<Waves className="h-3.5 w-3.5" />} tooltip="Total Harmonic Distortion of voltage. IEEE 519 limit is typically 5%." />
                <SummaryCard title="Frequency" unit="Hz" avg={summary?.freq?.avg} min={summary?.freq?.min} max={summary?.freq?.max}
                    icon={<Activity className="h-3.5 w-3.5" />} tooltip="Grid frequency. Normal range: 49.9–50.1 Hz (50 Hz grid)." />
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Energy Consumed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold tabular-nums">
                            {summary?.energy_kwh != null ? fmt(summary.energy_kwh, 1) : "--"}
                            <span className="text-sm font-normal text-muted-foreground ml-1">kWh</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{summary?.count ?? 0} data points</div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Load Trend ──────────────────────────────────────────────── */}
            <Card>
                <CardHeader>
                    <CardTitle>Load Trend {isMultiMode ? "(Per Meter Comparison)" : ""}</CardTitle>
                    <CardDescription>
                        {isMultiMode
                            ? `Comparing active power (kW) across ${meterIds.join(", ")}. Each meter is a separate line.`
                            : "Active power (kW) over selected period. Alarm events marked as vertical lines."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                    {trendData.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                            {loading ? "Loading trend data..." : "No data for selected range."}
                        </div>
                    ) : isMultiMode ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData} syncId="history" margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                <XAxis dataKey="time" tickFormatter={v => formatTime(v, rangeMs)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={40} />
                                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                <Tooltip labelFormatter={v => new Date(v).toLocaleString()} contentStyle={tooltipStyle} />
                                <Legend />
                                {meterIds.map((id, i) => (
                                    <Line key={id} type="monotone" dataKey={`${id}_kw`} name={`${id} (kW)`}
                                        stroke={METER_COLORS[i % METER_COLORS.length]} strokeWidth={2} dot={false} isAnimationActive={false} />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData} syncId="history" margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gradLoad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                <XAxis dataKey="time" tickFormatter={v => formatTime(v, rangeMs)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={40} />
                                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                <Tooltip labelFormatter={v => new Date(v).toLocaleString()} formatter={(v: any) => [Number(v).toFixed(2), "kW"]} contentStyle={tooltipStyle} />
                                {alarms.map((a, i) => <ReferenceLine key={i} x={new Date(a.createdAt).getTime()} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1} label="" />)}
                                <Area type="monotone" dataKey="p_kw" name="kW" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#gradLoad)" isAnimationActive={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

            {/* ── Power Quality ────────────────────────────────────────────── */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Power Factor {isMultiMode ? "(Per Meter)" : "& THD"}</CardTitle>
                        <CardDescription>Crosshair synced with Load Trend above.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[260px]">
                        {trendData.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No data</div>
                        ) : isMultiMode ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData} syncId="history" margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                    <XAxis dataKey="time" tickFormatter={v => formatTime(v, rangeMs)} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={40} />
                                    <YAxis domain={[0, 1.05]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                    <Tooltip labelFormatter={v => new Date(v).toLocaleString()} contentStyle={tooltipStyle} />
                                    <Legend />
                                    {meterIds.map((id, i) => (
                                        <Line key={id} type="monotone" dataKey={`${id}_pf`} name={`${id} PF`}
                                            stroke={METER_COLORS[i % METER_COLORS.length]} strokeWidth={2} dot={false} isAnimationActive={false} />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData} syncId="history" margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                    <XAxis dataKey="time" tickFormatter={v => formatTime(v, rangeMs)} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={40} />
                                    <YAxis yAxisId="pf" domain={[0, 1.05]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                    <YAxis yAxisId="thd" orientation="right" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                    <Tooltip labelFormatter={v => new Date(v).toLocaleString()} contentStyle={tooltipStyle} />
                                    <Legend />
                                    <Line yAxisId="pf" type="monotone" dataKey="pf" name="PF" stroke="#22c55e" strokeWidth={2} dot={false} isAnimationActive={false} />
                                    <Line yAxisId="thd" type="monotone" dataKey="thd_v" name="THD-V %" stroke="#f59e0b" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                                    <Line yAxisId="thd" type="monotone" dataKey="thd_i" name="THD-I %" stroke="#ef4444" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Grid Frequency</CardTitle>
                        <CardDescription>Normal range: 49.9–50.1 Hz. Drifts indicate grid instability.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[260px]">
                        {trendData.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No data</div>
                        ) : isMultiMode ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData} syncId="history" margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                    <XAxis dataKey="time" tickFormatter={v => formatTime(v, rangeMs)} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={40} />
                                    <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                    <Tooltip labelFormatter={v => new Date(v).toLocaleString()} contentStyle={tooltipStyle} />
                                    <Legend />
                                    <ReferenceLine y={50} stroke="#94a3b8" strokeDasharray="6 3" />
                                    {meterIds.map((id, i) => (
                                        <Line key={id} type="monotone" dataKey={`${id}_freq`} name={`${id} Hz`}
                                            stroke={METER_COLORS[i % METER_COLORS.length]} strokeWidth={2} dot={false} isAnimationActive={false} />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData} syncId="history" margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                    <XAxis dataKey="time" tickFormatter={v => formatTime(v, rangeMs)} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={40} />
                                    <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                    <Tooltip labelFormatter={v => new Date(v).toLocaleString()} formatter={(v: any) => [`${Number(v).toFixed(3)} Hz`, "Frequency"]} contentStyle={tooltipStyle} />
                                    <ReferenceLine y={50} stroke="#94a3b8" strokeDasharray="6 3" label={{ value: "50 Hz", position: "right", fontSize: 10 }} />
                                    <Line type="monotone" dataKey="freq" name="Hz" stroke="#8b5cf6" strokeWidth={2} dot={false} isAnimationActive={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ── Phase Voltages (single-meter only for clarity) ────────── */}
            {!isMultiMode && (
                <Card>
                    <CardHeader>
                        <CardTitle>Phase Voltages (L-N RMS)</CardTitle>
                        <CardDescription>3-phase voltage balance. Large imbalances may indicate wiring issues or unbalanced loads.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {trendData.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No data</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData} syncId="history" margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                    <XAxis dataKey="time" tickFormatter={v => formatTime(v, rangeMs)} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={40} />
                                    <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                    <Tooltip labelFormatter={v => new Date(v).toLocaleString()}
                                        formatter={(v: any, name: any) => [`${Number(v).toFixed(1)} V`, name === "v_a" ? "Phase A" : name === "v_b" ? "Phase B" : "Phase C"]}
                                        contentStyle={tooltipStyle} />
                                    <Legend />
                                    <Line type="monotone" dataKey="v_a" name="Phase A" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} />
                                    <Line type="monotone" dataKey="v_b" name="Phase B" stroke="#eab308" strokeWidth={2} dot={false} isAnimationActive={false} />
                                    <Line type="monotone" dataKey="v_c" name="Phase C" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ── Alarm History Table ──────────────────────────────────────── */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Alarm History</CardTitle>
                            <CardDescription>Events and alarms within the selected time window.</CardDescription>
                        </div>
                        <Badge variant="outline">{alarms.length} events</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {alarms.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">No alarms in the selected period.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left text-muted-foreground">
                                        <th className="pb-2 pr-4 font-medium">Timestamp</th>
                                        <th className="pb-2 pr-4 font-medium">Meter</th>
                                        <th className="pb-2 pr-4 font-medium">Severity</th>
                                        <th className="pb-2 pr-4 font-medium">Code</th>
                                        <th className="pb-2 pr-4 font-medium">Message</th>
                                        <th className="pb-2 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {alarms.map((a, i) => (
                                        <tr key={i} className="border-b border-border/50 hover:bg-accent/50 cursor-pointer transition-colors">
                                            <td className="py-2 pr-4 tabular-nums text-xs">{new Date(a.createdAt).toLocaleString()}</td>
                                            <td className="py-2 pr-4 font-mono text-xs">{a.asset_id || "--"}</td>
                                            <td className="py-2 pr-4">
                                                <Badge variant={a.severity === "critical" ? "destructive" : a.severity === "warning" ? "default" : "secondary"} className="text-xs">
                                                    {a.severity || "info"}
                                                </Badge>
                                            </td>
                                            <td className="py-2 pr-4 font-mono text-xs">{a.code || "--"}</td>
                                            <td className="py-2 pr-4 max-w-[300px] truncate">{a.msg || a.message || "--"}</td>
                                            <td className="py-2">
                                                {a.acknowledged ?
                                                    <Badge variant="outline" className="text-xs">ACK</Badge> :
                                                    <Badge variant="destructive" className="text-xs">Active</Badge>
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
