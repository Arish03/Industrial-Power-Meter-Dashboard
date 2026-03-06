"use client"

import { useEffect, useState } from "react"
import { Activity, Zap, Shield, BarChart3 } from "lucide-react"

import { use } from "react"
import { getSocket } from "@/lib/socket"
import { fetchTelemetry, fetchAlarms, fetchStatus } from "@/lib/api"
import { MetricsCard } from "@/components/dashboard/MetricsCard"
import { TrendChart } from "@/components/dashboard/TrendChart"
import { VoltageChart } from "@/components/dashboard/VoltageChart"
import { AlarmsPanel } from "@/components/dashboard/AlarmsPanel"
import { Badge } from "@/components/ui/badge"

export default function DashboardPage({ params }: { params: Promise<{ siteId: string, assetId: string }> }) {
    const { siteId, assetId } = use(params)
    const [telemetryHistory, setTelemetryHistory] = useState<any[]>([])
    const [latestTelemetry, setLatestTelemetry] = useState<any>(null)
    const [alarms, setAlarms] = useState<any[]>([])
    const [status, setStatus] = useState<any>({ state: "offline" })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Initial fetch
        const loadData = async () => {
            try {
                const [historicalData, alarmData, statusData] = await Promise.all([
                    fetchTelemetry(60, siteId, assetId).catch(() => []),
                    fetchAlarms(5).catch(() => []),
                    fetchStatus(siteId, assetId).catch(() => ({ state: "offline" }))
                ])

                // Data comes newest first, reverse for chart (oldest to newest)
                const reversedHistory = Array.isArray(historicalData) ? [...historicalData].reverse() : []
                setTelemetryHistory(reversedHistory)

                if (reversedHistory.length > 0) {
                    setLatestTelemetry(reversedHistory[reversedHistory.length - 1])
                }

                if (Array.isArray(alarmData)) setAlarms(alarmData)
                if (statusData) setStatus(statusData)
            } catch (err) {
                console.error("Error loading initial data", err)
            } finally {
                setLoading(false)
            }
        }

        loadData()

        // Setup Socket connection
        const socket = getSocket()

        // Listeners
        const onTelemetry = (data: any) => {
            if (data.site_id === siteId && data.asset_id === assetId) {
                setLatestTelemetry(data)
                setTelemetryHistory(prev => {
                    const newHistory = [...prev, data]
                    if (newHistory.length > 60) newHistory.shift() // Keep only 60 points
                    return newHistory
                })
            }
        }

        const onAlarm = (data: any) => {
            if (data.site_id === siteId && data.asset_id === assetId) {
                setAlarms(prev => {
                    const newAlarms = [data, ...prev]
                    if (newAlarms.length > 5) newAlarms.pop()
                    return newAlarms
                })
            }
        }

        const onStatus = (data: any) => {
            if (data.site_id === siteId && data.asset_id === assetId) {
                setStatus(data)
            }
        }

        socket.on("telemetry", onTelemetry)
        socket.on("alarm", onAlarm)
        socket.on("status", onStatus)

        return () => {
            socket.off("telemetry", onTelemetry)
            socket.off("alarm", onAlarm)
            socket.off("status", onStatus)
        }
    }, [])

    const volAvg = latestTelemetry?.elec?.v_ln_rms ?
        (latestTelemetry.elec.v_ln_rms.A + latestTelemetry.elec.v_ln_rms.B + latestTelemetry.elec.v_ln_rms.C) / 3 : 0

    return (
        <div className="flex-1 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{siteId} / {assetId}</h2>
                    <p className="text-muted-foreground">Real-time telemetry and alarms.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={status?.state === "online" ? "default" : "destructive"} className="px-3 py-1">
                        <span className={`w-2 h-2 rounded-full mr-2 ${status?.state === "online" ? "bg-green-400" : "bg-red-400"} animate-pulse`}></span>
                        {status?.state === "online" ? "Online" : "Offline"}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                        {latestTelemetry?.device_sn || "Waiting for device..."}
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricsCard
                    title="Avg Voltage (L-N)"
                    value={volAvg ? volAvg.toFixed(1) : "--"}
                    unit="V"
                    icon={<Zap className="h-4 w-4 text-muted-foreground" />}
                    description={`Freq: ${latestTelemetry?.elec?.freq_hz?.toFixed(2) ?? "--"} Hz`}
                />
                <MetricsCard
                    title="Total Current"
                    value={latestTelemetry?.elec?.i_rms ?
                        (latestTelemetry.elec.i_rms.A + latestTelemetry.elec.i_rms.B + latestTelemetry.elec.i_rms.C).toFixed(1) : "--"}
                    unit="A"
                    icon={<Activity className="h-4 w-4 text-muted-foreground" />}
                    description="Sum of all phases"
                />
                <MetricsCard
                    title="Active Power"
                    value={latestTelemetry?.elec?.p_kw?.total?.toFixed(2) ?? "--"}
                    unit="kW"
                    icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
                    description={`Apparent: ${latestTelemetry?.elec?.s_kva?.total?.toFixed(2) ?? "--"} kVA`}
                />
                <MetricsCard
                    title="Power Factor"
                    value={latestTelemetry?.elec?.pf_total?.toFixed(3) ?? "--"}
                    unit="PF"
                    icon={<Shield className="h-4 w-4 text-muted-foreground" />}
                    description={`Total THD: ${latestTelemetry?.pq?.thd_v_pct_est?.toFixed(1) ?? "--"}%`}
                />
            </div>

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
                <div className="col-span-1 lg:col-span-2 flex flex-col gap-4">
                    <TrendChart data={telemetryHistory} />
                    <VoltageChart data={telemetryHistory} />
                </div>

                <div className="col-span-1 flex flex-col gap-4">
                    <AlarmsPanel alarms={alarms} />
                </div>
            </div>
        </div>
    )
}
