"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Activity, ServerCrash, Server, Zap } from "lucide-react"

import { getSocket } from "@/lib/socket"
import { fetchDevices, fetchStatus } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function OverviewPage() {
    const [sites, setSites] = useState<Record<string, any[]>>({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Load initial devices list
        fetchDevices()
            .then(data => {
                if (data) setSites(data)
            })
            .catch(err => console.error("Error loading devices", err))
            .finally(() => setLoading(false))

        const socket = getSocket()

        // Listen for live updates and dynamically inject new devices if they don't exist
        const onTelemetry = (data: any) => {
            setSites(prev => {
                const newSites = { ...prev }
                const siteId = data.site_id || "unknown"
                const assetId = data.asset_id || "unknown"

                if (!newSites[siteId]) {
                    newSites[siteId] = []
                }

                const existingAssetIndex = newSites[siteId].findIndex(a => a.asset_id === assetId)
                if (existingAssetIndex >= 0) {
                    // Update latest data
                    newSites[siteId][existingAssetIndex].latestData = data

                    // Keep existing state if we haven't received a status event
                    if (newSites[siteId][existingAssetIndex].state === undefined) {
                        newSites[siteId][existingAssetIndex].state = "online"
                    }
                } else {
                    // Add new asset
                    newSites[siteId].push({ asset_id: assetId, latestData: data, state: "online" })
                }

                return newSites
            })
        }

        const onStatus = (data: any) => {
            setSites(prev => {
                const newSites = { ...prev }
                const siteId = data.site_id || "unknown"
                const assetId = data.asset_id || "unknown"

                if (!newSites[siteId]) {
                    newSites[siteId] = []
                }

                const existingAssetIndex = newSites[siteId].findIndex(a => a.asset_id === assetId)
                if (existingAssetIndex >= 0) {
                    // Only update the state
                    newSites[siteId][existingAssetIndex].state = data.state
                } else {
                    // Add new asset just from status (edge case)
                    newSites[siteId].push({ asset_id: assetId, state: data.state })
                }
                return newSites
            })
        }

        socket.on("telemetry", onTelemetry)
        socket.on("status", onStatus)

        return () => {
            socket.off("telemetry", onTelemetry)
            socket.off("status", onStatus)
        }
    }, [])

    if (loading) {
        return <div className="flex h-64 items-center justify-center text-muted-foreground">Scanning for active sites...</div>
    }

    if (Object.keys(sites).length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                <ServerCrash className="h-16 w-16 text-muted-foreground opacity-50" />
                <h3 className="text-xl font-bold">No Power Meters Found</h3>
                <p className="text-muted-foreground text-center max-w-sm">
                    Waiting for telemetry data... ensure devices are powered on and the MQTT bridge is active.
                </p>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Fleet Overview</h2>
                <p className="text-muted-foreground">Monitor all active sites and connected power meters.</p>
            </div>

            {Object.entries(sites).map(([siteId, assets]) => (
                <div key={siteId} className="space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2">
                        <Server className="h-5 w-5 text-primary" />
                        <h3 className="text-xl font-semibold capitalize">{siteId}</h3>
                        <Badge variant="outline" className="ml-2 font-normal">{assets.length} active meters</Badge>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {assets.map((asset) => {
                            const data = asset.latestData?.elec || {}
                            const powerKw = data.p_kw?.total?.toFixed(2)
                            const currentTotal = data.i_rms ? (data.i_rms.A + data.i_rms.B + data.i_rms.C).toFixed(1) : "--"

                            // Determine status from explicitly set state, or fallback to heuristics if strictly necessary
                            // If `asset.state` exists and is explicit, use it. Otherwise, assume online if we have data.
                            const isOnline = asset.state === "online" || (asset.state === undefined && asset.latestData)

                            return (
                                <Link key={asset.asset_id} href={`/dashboard/${siteId}/${asset.asset_id}`}>
                                    <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <Activity className="h-4 w-4" />
                                                    {asset.asset_id}
                                                </CardTitle>
                                                <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                            </div>
                                            <CardDescription className="text-xs">{asset.latestData?.device_sn || "Unknown SN"}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-3xl font-bold">{powerKw || "--"}</span>
                                                <span className="text-sm font-medium text-muted-foreground">kW Total</span>
                                            </div>
                                            <div className="mt-4 flex items-center text-xs text-muted-foreground">
                                                <Zap className="h-3 w-3 mr-1" />
                                                <span>{currentTotal} A</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
    )
}
