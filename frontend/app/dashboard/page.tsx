"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
    Zap, Activity, Gauge, Waves, Clock, RefreshCw, AlertTriangle,
    TrendingUp, TrendingDown, Minus, Server, ChevronRight, Download
} from "lucide-react"

import { fetchDevices, fetchDashboardSummary, fetchDashboardTrend, fetchDashboardDemand, fetchHistoryAlarms, getExportUrl } from "@/lib/api"
import { getSocket } from "@/lib/socket"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, Cell
} from "recharts"

const TIME_PRESETS = [
    { label: "Today", ms: 24 * 3600000 },
    { label: "7d", ms: 7 * 24 * 3600000 },
    { label: "30d", ms: 30 * 24 * 3600000 },
]

const fmt = (v: number | null | undefined, d = 2) => (v != null ? Number(v).toFixed(d) : "--")

const formatTime = (tick: number, rangeMs: number) => {
    const dt = new Date(tick)
    if (rangeMs <= 24 * 3600000) return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
    if (rangeMs <= 7 * 24 * 3600000) return dt.toLocaleDateString([], { weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false })
    return dt.toLocaleDateString([], { month: "short", day: "numeric" })
}

export default function DashboardPage() {
    const [sites, setSites] = useState<Record<string, any[]>>({})
    const [selectedSite, setSelectedSite] = useState("")
    const [selectedMeter, setSelectedMeter] = useState("")  // "" = all meters
    const [rangeMs, setRangeMs] = useState(TIME_PRESETS[0].ms)
    const [activePreset, setActivePreset] = useState("Today")

    const [summary, setSummary] = useState<any>(null)
    const [trend, setTrend] = useState<any[]>([])
    const [demand, setDemand] = useState<any>({ trend: [], peak: {} })
    const [alarms, setAlarms] = useState<any[]>([])
    const [statuses, setStatuses] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(false)

    // Load sites
    useEffect(() => {
        fetchDevices()
            .then(data => {
                if (data) {
                    setSites(data)
                    const first = Object.keys(data)[0]
                    if (first) setSelectedSite(first)
                }
            })
            .catch(console.error)
    }, [])

    // Listen for status updates
    useEffect(() => {
        const socket = getSocket()
        const onStatus = (data: any) => {
            if (data.site_id === selectedSite) {
                setStatuses(prev => ({ ...prev, [data.asset_id]: data.state }))
            }
        }
        const onTelemetry = (data: any) => {
            if (data.site_id === selectedSite) {
                setStatuses(prev => ({ ...prev, [data.asset_id]: "online" }))
            }
        }
        socket.on("status", onStatus)
        socket.on("telemetry", onTelemetry)
        return () => { socket.off("status", onStatus); socket.off("telemetry", onTelemetry) }
    }, [selectedSite])

    // Fetch dashboard data
    const loadDashboard = useCallback(async () => {
        if (!selectedSite) return
        setLoading(true)
        const end = Date.now()
        const start = end - rangeMs
        const meter = selectedMeter || undefined

        try {
            const [sum, tr, dem, al] = await Promise.all([
                fetchDashboardSummary(selectedSite, start, end, meter).catch(() => null),
                fetchDashboardTrend(selectedSite, start, end, meter).catch(() => []),
                fetchDashboardDemand(selectedSite, start, end, meter).catch(() => ({ trend: [], peak: {} })),
                // Fetch all alarms for the site (using first meter as fallback; ideally site-wide)
                fetchHistoryAlarms(selectedSite, meter || (sites[selectedSite]?.[0]?.asset_id || "pmu01"), start, end).catch(() => []),
            ])
            setSummary(sum)
            setTrend(Array.isArray(tr) ? tr : [])
            setDemand(dem || { trend: [], peak: {} })
            setAlarms(Array.isArray(al) ? al : [])
        } catch (err) {
            console.error("Dashboard fetch error", err)
        } finally {
            setLoading(false)
        }
    }, [selectedSite, selectedMeter, rangeMs, sites])

    useEffect(() => { loadDashboard() }, [loadDashboard])

    const siteKeys = Object.keys(sites)
    const assetsForSite = sites[selectedSite] || []
    const perMeter = summary?.perMeter || {}

    // Energy breakdown data
    const breakdownData = Object.entries(perMeter).map(([id, m]: [string, any]) => ({
        name: id, kwh: m.kwh || 0, avg_kw: m.avg_kw || 0
    }))
    const totalKwh = summary?.total_kwh || 0

    return (
        <div className="flex-1 space-y-6">
            {/* ── Top Bar ──────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                    <p className="text-muted-foreground">Site-level energy analytics and monitoring.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadDashboard} disabled={loading} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border bg-background hover:bg-accent text-sm disabled:opacity-50">
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
                    </button>
                </div>
            </div>

            {/* ── Controls ─────────────────────────────────────────────── */}
            <Card>
                <CardContent className="pt-4 pb-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-muted-foreground">Site</label>
                            <select value={selectedSite} onChange={e => { setSelectedSite(e.target.value); setSelectedMeter("") }}
                                className="h-9 px-3 rounded-md border bg-background text-sm min-w-[120px]">
                                {siteKeys.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-muted-foreground">Meter</label>
                            <select value={selectedMeter} onChange={e => setSelectedMeter(e.target.value)}
                                className="h-9 px-3 rounded-md border bg-background text-sm min-w-[120px]">
                                <option value="">All Meters</option>
                                {assetsForSite.map((a: any) => <option key={a.asset_id} value={a.asset_id}>{a.asset_id}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-muted-foreground">Date Range</label>
                            <div className="flex gap-1">
                                {TIME_PRESETS.map(p => (
                                    <button key={p.label} onClick={() => { setRangeMs(p.ms); setActivePreset(p.label) }}
                                        className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${activePreset === p.label ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent"}`}>
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── KPI Cards ────────────────────────────────────────────── */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Total Energy</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold tabular-nums">{fmt(summary?.total_kwh, 1)} <span className="text-sm font-normal text-muted-foreground">kWh</span></div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> Avg Load</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold tabular-nums">{fmt(summary?.avg_kw)} <span className="text-sm font-normal text-muted-foreground">kW</span></div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-red-400" /> Peak Load</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold tabular-nums">{fmt(summary?.max_kw)} <span className="text-sm font-normal text-muted-foreground">kW</span></div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Gauge className="h-3.5 w-3.5" /> Avg PF</CardTitle></CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold tabular-nums ${(summary?.avg_pf || 1) < 0.9 ? "text-red-500" : ""}`}>
                            {fmt(summary?.pf_weighted ?? summary?.avg_pf, 3)} <span className="text-sm font-normal text-muted-foreground">PF</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">Min: {fmt(summary?.min_pf, 3)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Waves className="h-3.5 w-3.5" /> THD-V</CardTitle></CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold tabular-nums ${(summary?.max_thd_v || 0) > 5 ? "text-amber-500" : ""}`}>
                            {fmt(summary?.avg_thd_v, 1)} <span className="text-sm font-normal text-muted-foreground">%</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">Max: {fmt(summary?.max_thd_v, 1)}%</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Alarms</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold tabular-nums">{alarms.length}</div><div className="text-xs text-muted-foreground mt-0.5">{summary?.count ?? 0} data points</div></CardContent>
                </Card>
            </div>

            {/* ── Main Content: 2/3 charts + 1/3 Alerts ────────────────── */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
                {/* Left 2/3 */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Energy Consumption Trend */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Energy Consumption Trend</CardTitle>
                            <CardDescription>Aggregated active power (kW) with PF overlay. Red vertical lines indicate alarms.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[320px]">
                            {trend.length === 0 ? (
                                <div className="flex h-full items-center justify-center text-muted-foreground">{loading ? "Loading..." : "No data"}</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trend} syncId="dash" margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="gLoad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                        <XAxis dataKey="time" tickFormatter={v => formatTime(v, rangeMs)} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={40} />
                                        <YAxis yAxisId="kw" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                        <YAxis yAxisId="pf" orientation="right" domain={[0, 1.05]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                        <Tooltip labelFormatter={v => new Date(v).toLocaleString()} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }} />
                                        <Legend />
                                        {alarms.map((a, i) => <ReferenceLine key={i} x={new Date(a.createdAt).getTime()} yAxisId="kw" stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1} />)}
                                        <Area yAxisId="kw" type="monotone" dataKey="p_kw" name="kW" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#gLoad)" isAnimationActive={false} />
                                        <Line yAxisId="pf" type="monotone" dataKey="pf" name="PF" stroke="#22c55e" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>

                    {/* Bottom: Demand + Energy Breakdown side by side */}
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                        {/* Maximum Demand */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Maximum Demand</CardTitle>
                                <CardDescription>
                                    {demand.peak?.kw ? (
                                        <>Peak: <strong>{fmt(demand.peak.kw)} kW</strong> at {demand.peak.time ? new Date(demand.peak.time).toLocaleString() : "--"} ({demand.peak.topMeter || "?"})</>
                                    ) : "No peak data"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="h-[220px]">
                                {(demand.trend || []).length === 0 ? (
                                    <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No data</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={demand.trend} syncId="dash" margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="gDemand" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                            <XAxis dataKey="time" tickFormatter={v => formatTime(v, rangeMs)} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} minTickGap={30} />
                                            <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                                            <Tooltip labelFormatter={v => new Date(v).toLocaleString()} formatter={(v: any) => [`${Number(v).toFixed(2)} kW`, "Demand"]} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }} />
                                            {demand.peak?.time && <ReferenceLine x={demand.peak.time} stroke="#ef4444" strokeWidth={2} label={{ value: "PEAK", position: "top", fontSize: 10, fill: "#ef4444" }} />}
                                            <Area type="monotone" dataKey="total_kw" name="Demand kW" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#gDemand)" isAnimationActive={false} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>

                        {/* Energy Breakdown by Meter */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Energy Breakdown</CardTitle>
                                <CardDescription>Consumption share by meter in {selectedSite}</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[220px]">
                                {breakdownData.length === 0 ? (
                                    <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No data</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={breakdownData} layout="vertical" margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                                            <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={60} />
                                            <Tooltip formatter={(v: any) => [`${Number(v).toFixed(1)} kWh`, "Energy"]} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }} />
                                            <Bar dataKey="kwh" name="kWh" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                                                {breakdownData.map((_, i) => (
                                                    <Cell key={i} fill={["#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444"][i % 5]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Right 1/3 — Alerts + Coverage */}
                <div className="space-y-4">
                    {/* Alerts Panel */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">Alerts</CardTitle>
                                <Badge variant="outline">{alarms.length}</Badge>
                            </div>
                            <CardDescription>Recent alarms for {selectedSite}. Click to investigate.</CardDescription>
                        </CardHeader>
                        <CardContent className="max-h-[320px] overflow-y-auto">
                            {alarms.length === 0 ? (
                                <div className="text-center py-6 text-muted-foreground text-sm">No alarms in selected range.</div>
                            ) : (
                                <div className="space-y-2">
                                    {alarms.slice(0, 15).map((a, i) => (
                                        <div key={i} className="flex items-start gap-2 p-2 rounded-md border border-border/50 hover:bg-accent/50 transition-colors cursor-pointer text-xs">
                                            <Badge variant={a.severity === "critical" ? "destructive" : a.severity === "warning" ? "default" : "secondary"} className="text-[10px] shrink-0 mt-0.5">
                                                {a.severity || "info"}
                                            </Badge>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                    <span className="font-mono">{a.asset_id || "--"}</span>
                                                    <span>·</span>
                                                    <span>{new Date(a.createdAt).toLocaleTimeString()}</span>
                                                </div>
                                                <div className="truncate mt-0.5">{a.msg || a.message || a.code || "--"}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Coverage: Site → Meters + Status */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Coverage</CardTitle>
                            <CardDescription>{selectedSite} → {assetsForSite.length} meters</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {assetsForSite.map((asset: any) => {
                                    const st = statuses[asset.asset_id] || "unknown"
                                    const isOnline = st === "online"
                                    const meterData = perMeter[asset.asset_id]
                                    return (
                                        <Link key={asset.asset_id} href={`/dashboard/${selectedSite}/${asset.asset_id}`}>
                                            <div className="flex items-center justify-between p-2 rounded-md border border-border/50 hover:bg-accent/50 transition-colors cursor-pointer">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                                                    <span className="text-sm font-medium">{asset.asset_id}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    {meterData && <span>{fmt(meterData.avg_kw, 1)} kW avg</span>}
                                                    <ChevronRight className="h-3.5 w-3.5" />
                                                </div>
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
