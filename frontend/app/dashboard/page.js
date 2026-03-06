"use client";

import { useEffect, useState, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import { getTelemetry, getAlarms, getInfo, getStatus } from "@/lib/api";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wifi, WifiOff, Zap, Activity, Gauge, Battery, Thermometer, BarChart3, AlertTriangle, CheckCheck, AlertCircle, Info, Cpu, Moon, Sun } from "lucide-react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const MAX_HISTORY = 60;

function fmt(v, dec = 2) {
    if (v === undefined || v === null) return "--";
    return Number(v).toFixed(dec);
}

function nowStr() {
    return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({ icon: Icon, title, value, unit, sub, valueClass = "text-primary" }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    {Icon && <Icon className="size-3.5" />}{title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold font-mono ${valueClass}`}>
                    {value ?? "--"}{unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
                </div>
                {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
            </CardContent>
        </Card>
    );
}

// ── Phase Table ──────────────────────────────────────────────────────────────
function PhaseTable({ telemetry }) {
    const v = telemetry?.elec?.v_ln_rms || {};
    const i = telemetry?.elec?.i_rms || {};
    const phases = ["A", "B", "C"];
    const phaseColors = { A: "text-red-400", B: "text-yellow-400", C: "text-emerald-400" };

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Phase Measurements
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-xs">Phase</TableHead>
                            <TableHead className="text-xs">Voltage (V)</TableHead>
                            <TableHead className="text-xs">Current (A)</TableHead>
                            <TableHead className="text-xs">Power (kW)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {phases.map((ph) => {
                            const voltage = v[ph];
                            const current = i[ph];
                            const power = voltage && current ? ((voltage * current) / 1000).toFixed(2) : "--";
                            return (
                                <TableRow key={ph}>
                                    <TableCell>
                                        <Badge variant="outline" className={`font-mono text-xs ${phaseColors[ph]}`}>{ph}</Badge>
                                    </TableCell>
                                    <TableCell className={`font-mono text-sm ${phaseColors[ph]}`}>{fmt(voltage, 1)}</TableCell>
                                    <TableCell className={`font-mono text-sm ${phaseColors[ph]}`}>{fmt(current, 1)}</TableCell>
                                    <TableCell className="font-mono text-sm text-muted-foreground">{power}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

// ── Trend Chart ──────────────────────────────────────────────────────────────
const CHART_COLORS = { A: "#f87171", B: "#fbbf24", C: "#34d399", total: "#22d3ee", default: "#60a5fa" };

function TrendChart({ title, data = [], lines = [] }) {
    if (!data.length) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-36 text-muted-foreground text-sm">
                    Waiting for data…
                </CardContent>
            </Card>
        );
    }
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 2, right: 4, left: -24, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#6b7280" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                            <YAxis tick={{ fontSize: 9, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                            <Tooltip
                                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                                labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                            />
                            {lines.length > 1 && <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />}
                            {lines.map((l) => (
                                <Line key={l.key} type="monotone" dataKey={l.key} name={l.label}
                                    stroke={l.color || CHART_COLORS[l.key] || CHART_COLORS.default}
                                    strokeWidth={1.5} dot={false} isAnimationActive={false} />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

// ── Alarm Panel ──────────────────────────────────────────────────────────────
function AlarmPanel({ alarms = [] }) {
    const active = alarms.filter((a) => !a.acknowledged);
    const icons = { critical: AlertCircle, warning: AlertTriangle, info: Info };
    const colors = { critical: "text-destructive", warning: "text-yellow-400", info: "text-blue-400" };

    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><AlertTriangle className="size-3.5" />Alarms</span>
                    <Badge variant={active.length ? "destructive" : "secondary"} className="text-xs">{active.length} active</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {alarms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-24 text-muted-foreground gap-2 text-sm">
                        <CheckCheck className="size-5 text-emerald-500" />No alarms
                    </div>
                ) : (
                    <ScrollArea className="h-64">
                        <div className="px-4 pb-4 space-y-2">
                            {alarms.map((alarm, i) => {
                                const Icon = icons[alarm.severity] || icons.warning;
                                return (
                                    <div key={alarm._id || i} className={`flex items-start gap-2 p-2.5 rounded-md border-l-2 text-sm ${alarm.acknowledged ? "opacity-40" : ""} ${alarm.severity === "critical" ? "border-destructive bg-destructive/5" : alarm.severity === "warning" ? "border-yellow-500 bg-yellow-500/5" : "border-blue-500 bg-blue-500/5"}`}>
                                        <Icon className={`size-3.5 mt-0.5 shrink-0 ${colors[alarm.severity] || colors.warning}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-mono font-semibold text-xs">{alarm.code}</p>
                                            <p className="text-xs text-muted-foreground">{alarm.msg}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}

// ── Info Panel ───────────────────────────────────────────────────────────────
function InfoPanel({ info }) {
    const rows = [
        ["Serial", info?.device_sn],
        ["Type", info?.device_type?.replace(/_/g, " ")],
        ["Firmware", info?.fw_version],
        ["Hardware", info?.hw],
        ["Phases", info?.phases ? `${info.phases}Φ` : null],
        ["Nom. V", info?.nominal_v_ln ? `${info.nominal_v_ln} V` : null],
        ["Nom. Freq", info?.nominal_freq_hz ? `${info.nominal_freq_hz} Hz` : null],
        ["Site", info?.site_id],
    ];
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="size-3.5" />Device Info
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    {rows.map(([label, val]) => (
                        <div key={label}>
                            <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
                            <p className="font-mono text-xs text-foreground">{val || "--"}</p>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

// ── Main Dashboard Page ──────────────────────────────────────────────────────
export default function DashboardPage() {
    const [telemetry, setTelemetry] = useState(null);
    const [status, setStatus] = useState(null);
    const [alarms, setAlarms] = useState([]);
    const [info, setInfo] = useState(null);
    const [connected, setConnected] = useState(false);
    const [currentTime, setCurrentTime] = useState("");
    const [voltageHistory, setVH] = useState([]);
    const [currentHistory, setCH] = useState([]);
    const [powerHistory, setPH] = useState([]);
    const [darkMode, setDarkMode] = useState(true);

    // Theme toggle
    function toggleTheme() {
        setDarkMode((prev) => {
            const next = !prev;
            document.documentElement.classList.toggle("dark", next);
            return next;
        });
    }

    useEffect(() => {
        setCurrentTime(nowStr());
        const t = setInterval(() => setCurrentTime(nowStr()), 1000);
        return () => clearInterval(t);
    }, []);

    const appendHistory = useCallback((setter, point) => {
        setter((prev) => {
            const next = [...prev, point];
            return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
        });
    }, []);

    // Seed from REST API
    useEffect(() => {
        async function load() {
            try {
                const [tel, st, al, inf] = await Promise.allSettled([
                    getTelemetry(60), getStatus(), getAlarms(20), getInfo(),
                ]);
                if (tel.status === "fulfilled" && tel.value.length) {
                    const history = [...tel.value].reverse();
                    setTelemetry(tel.value[0]);
                    setVH(history.map((d, i) => ({ time: `T-${history.length - i}s`, A: d.elec?.v_ln_rms?.A, B: d.elec?.v_ln_rms?.B, C: d.elec?.v_ln_rms?.C })));
                    setCH(history.map((d, i) => ({ time: `T-${history.length - i}s`, A: d.elec?.i_rms?.A, B: d.elec?.i_rms?.B, C: d.elec?.i_rms?.C })));
                    setPH(history.map((d, i) => ({ time: `T-${history.length - i}s`, total: d.elec?.p_kw?.total })));
                }
                if (st.status === "fulfilled") setStatus(st.value);
                if (al.status === "fulfilled") setAlarms(al.value);
                if (inf.status === "fulfilled") setInfo(inf.value);
            } catch { /* backend not running yet */ }
        }
        load();
    }, []);

    // Socket.IO real-time
    useEffect(() => {
        const socket = getSocket();
        const onConnect = () => setConnected(true);
        const onDisconnect = () => setConnected(false);
        const onTelemetry = (data) => {
            setTelemetry(data);
            const t = nowStr();
            appendHistory(setVH, { time: t, A: data.elec?.v_ln_rms?.A, B: data.elec?.v_ln_rms?.B, C: data.elec?.v_ln_rms?.C });
            appendHistory(setCH, { time: t, A: data.elec?.i_rms?.A, B: data.elec?.i_rms?.B, C: data.elec?.i_rms?.C });
            appendHistory(setPH, { time: t, total: data.elec?.p_kw?.total });
        };
        const onStatus = (d) => setStatus(d);
        const onAlarm = (d) => setAlarms((p) => [d, ...p].slice(0, 20));
        const onHistory = (d) => setAlarms(d);
        const onInfo = (d) => setInfo(d);

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("telemetry", onTelemetry);
        socket.on("status", onStatus);
        socket.on("alarm", onAlarm);
        socket.on("alarms:history", onHistory);
        socket.on("info", onInfo);
        if (socket.connected) setConnected(true);

        return () => {
            socket.off("connect", onConnect); socket.off("disconnect", onDisconnect);
            socket.off("telemetry", onTelemetry); socket.off("status", onStatus);
            socket.off("alarm", onAlarm); socket.off("alarms:history", onHistory);
            socket.off("info", onInfo);
        };
    }, [appendHistory]);

    const elec = telemetry?.elec || {};
    const energy = telemetry?.energy || {};
    const pq = telemetry?.pq || {};
    const health = telemetry?.health || {};
    const isOnline = status?.state === "online";

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
                <SidebarTrigger className="-ml-1 shrink-0" />
                <Separator orientation="vertical" className="h-4" />
                <div className="flex-1 min-w-0">
                    <h1 className="text-sm font-semibold leading-tight">Dashboard</h1>
                    <p className="text-xs text-muted-foreground truncate hidden sm:block">{info?.site_id || "site01"} / {info?.asset_id || "pmu01"}</p>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Clock */}
                    <span className="font-mono text-xs text-muted-foreground hidden md:block">{currentTime}</span>

                    {/* Theme Toggle */}
                    <Button variant="ghost" size="icon" onClick={toggleTheme} className="size-8" title="Toggle theme">
                        {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
                    </Button>

                    {/* Socket live badge */}
                    <Badge variant={connected ? "default" : "secondary"} className="gap-1.5 text-xs h-7 px-2.5">
                        {connected ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
                        <span className="hidden sm:inline">{connected ? "Live" : "Offline"}</span>
                    </Badge>

                    {/* Online / Offline indicator — bigger */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${isOnline
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                            : status?.state === "unknown" || !status
                                ? "border-zinc-500/40 bg-zinc-500/10 text-zinc-400"
                                : "border-red-500/40 bg-red-500/10 text-red-400"
                        }`}>
                        <span className={`size-2.5 rounded-full inline-block ${isOnline ? "bg-emerald-400 animate-pulse" : status?.state === "unknown" || !status ? "bg-zinc-500" : "bg-red-400"
                            }`} />
                        <span>{(status?.state || "UNKNOWN").toUpperCase()}</span>
                    </div>
                </div>
            </header>

            {/* Content */}
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">

                    {/* Row 1 – 6 Key Metrics */}
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Electrical Summary</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3">
                            <MetricCard icon={Activity} title="Power" value={fmt(elec.p_kw?.total, 2)} unit="kW" sub="Total active" valueClass="text-cyan-400" />
                            <MetricCard icon={Gauge} title="Power Factor" value={fmt(elec.pf_total, 3)} unit="" sub="cos φ" valueClass={elec.pf_total >= 0.95 ? "text-emerald-400" : elec.pf_total >= 0.85 ? "text-yellow-400" : "text-red-400"} />
                            <MetricCard icon={Zap} title="Frequency" value={fmt(elec.freq_hz, 2)} unit="Hz" sub="Grid frequency" valueClass="text-blue-400" />
                            <MetricCard icon={Battery} title="Energy" value={fmt(energy.import_kwh_total, 1)} unit="kWh" sub="Import total" valueClass="text-emerald-400" />
                            <MetricCard icon={BarChart3} title="Apparent" value={fmt(elec.s_kva?.total, 2)} unit="kVA" sub="S total" valueClass="text-blue-400" />
                            <MetricCard icon={Activity} title="Reactive" value={fmt(elec.q_kvar?.total, 2)} unit="kVAR" sub="Q total" valueClass="text-yellow-400" />
                        </div>
                    </div>

                    {/* Row 2 – THD/Health + Phase Table */}
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Phase Detail & Power Quality</p>
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 sm:gap-3">
                            <div className="grid grid-cols-3 lg:grid-cols-1 gap-2 sm:gap-3">
                                <MetricCard icon={Thermometer} title="THD Voltage" value={fmt(pq.thd_v_pct_est, 1)} unit="%" sub="Est. THD-V" valueClass={pq.thd_v_pct_est > 5 ? "text-red-400" : "text-emerald-400"} />
                                <MetricCard icon={Thermometer} title="THD Current" value={fmt(pq.thd_i_pct_est, 1)} unit="%" sub="Est. THD-I" valueClass={pq.thd_i_pct_est > 15 ? "text-red-400" : pq.thd_i_pct_est > 8 ? "text-yellow-400" : "text-emerald-400"} />
                                <MetricCard icon={Wifi} title="Signal" value={health.rssi_dbm} unit="dBm" sub="RSSI" valueClass={health.rssi_dbm > -50 ? "text-emerald-400" : health.rssi_dbm > -70 ? "text-yellow-400" : "text-red-400"} />
                            </div>
                            <div className="lg:col-span-3">
                                <PhaseTable telemetry={telemetry} />
                            </div>
                        </div>
                    </div>

                    {/* Row 3 – Trend Charts */}
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Trend History (60s)</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
                            <TrendChart title="Voltage Trend" data={voltageHistory} lines={[{ key: "A", label: "Phase A" }, { key: "B", label: "Phase B" }, { key: "C", label: "Phase C" }]} />
                            <TrendChart title="Current Trend" data={currentHistory} lines={[{ key: "A", label: "Phase A" }, { key: "B", label: "Phase B" }, { key: "C", label: "Phase C" }]} />
                            <TrendChart title="Power Trend" data={powerHistory} lines={[{ key: "total", label: "kW", color: "#22d3ee" }]} />
                        </div>
                    </div>

                    {/* Row 4 – Alarms + Device Info */}
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Alarms & Device</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
                            <AlarmPanel alarms={alarms} />
                            <InfoPanel info={info} />
                        </div>
                    </div>

                </div>
            </ScrollArea>
        </div>
    );
}
