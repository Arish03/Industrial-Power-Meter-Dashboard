const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

export async function fetchTelemetry(limit = 60, siteId?: string, assetId?: string) {
    const params = new URLSearchParams()
    if (limit) params.append("limit", limit.toString())
    if (siteId) params.append("site_id", siteId)
    if (assetId) params.append("asset_id", assetId)

    const res = await fetch(`${API_URL}/api/telemetry?${params.toString()}`)
    if (!res.ok) throw new Error("Failed to fetch telemetry")
    return res.json()
}

export async function fetchStatus(siteId?: string, assetId?: string) {
    const params = new URLSearchParams()
    if (siteId) params.append("site_id", siteId)
    if (assetId) params.append("asset_id", assetId)

    const query = params.toString() ? `?${params.toString()}` : ''
    const res = await fetch(`${API_URL}/api/status${query}`)
    if (!res.ok) throw new Error("Failed to fetch status")
    return res.json()
}

export async function fetchDevices() {
    const res = await fetch(`${API_URL}/api/devices`)
    if (!res.ok) throw new Error("Failed to fetch devices")
    return res.json()
}

export async function fetchAlarms(limit = 20) {
    const res = await fetch(`${API_URL}/api/alarms?limit=${limit}`)
    if (!res.ok) throw new Error("Failed to fetch alarms")
    return res.json()
}

export async function fetchInfo() {
    const res = await fetch(`${API_URL}/api/info`)
    if (!res.ok) throw new Error("Failed to fetch info")
    return res.json()
}

export async function fetchConfig() {
    const res = await fetch(`${API_URL}/api/config`)
    if (!res.ok) throw new Error("Failed to fetch config")
    return res.json()
}

export async function saveConfig(configData: any) {
    const res = await fetch(`${API_URL}/api/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configData),
    })
    if (!res.ok) throw new Error("Failed to save config")
    return res.json()
}

export async function fetchSettings() {
    const res = await fetch(`${API_URL}/api/settings`)
    if (!res.ok) throw new Error("Failed to fetch settings")
    return res.json()
}

export async function saveSettings(settingsData: any) {
    const res = await fetch(`${API_URL}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsData),
    })
    if (!res.ok) throw new Error("Failed to save settings")
    return res.json()
}

export async function ackAlarm(id: string) {
    const res = await fetch(`${API_URL}/api/alarms/${id}/acknowledge`, {
        method: "PATCH",
    })
    if (!res.ok) throw new Error("Failed to acknowledge alarm")
    return res.json()
}

// ── Dashboard / Site-Level ────────────────────────────────────────────────────

export async function fetchDashboardSummary(siteId: string, start: number, end: number, assetId?: string) {
    const params = new URLSearchParams({ site_id: siteId, start: start.toString(), end: end.toString() })
    if (assetId) params.append("asset_id", assetId)
    const res = await fetch(`${API_URL}/api/dashboard/summary?${params.toString()}`)
    if (!res.ok) throw new Error("Failed to fetch dashboard summary")
    return res.json()
}

export async function fetchDashboardTrend(siteId: string, start: number, end: number, assetId?: string) {
    const params = new URLSearchParams({ site_id: siteId, start: start.toString(), end: end.toString() })
    if (assetId) params.append("asset_id", assetId)
    const res = await fetch(`${API_URL}/api/dashboard/trend?${params.toString()}`)
    if (!res.ok) throw new Error("Failed to fetch dashboard trend")
    return res.json()
}

export async function fetchDashboardDemand(siteId: string, start: number, end: number, assetId?: string) {
    const params = new URLSearchParams({ site_id: siteId, start: start.toString(), end: end.toString() })
    if (assetId) params.append("asset_id", assetId)
    const res = await fetch(`${API_URL}/api/dashboard/demand?${params.toString()}`)
    if (!res.ok) throw new Error("Failed to fetch dashboard demand")
    return res.json()
}

// ── History / Analytics ───────────────────────────────────────────────────────

export async function fetchHistoryTelemetry(siteId: string, assetId: string | null, start: number, end: number, buckets = 120) {
    const params = new URLSearchParams({
        site_id: siteId,
        start: start.toString(), end: end.toString(),
        buckets: buckets.toString()
    })
    if (assetId) params.append("asset_id", assetId)
    const res = await fetch(`${API_URL}/api/history/telemetry?${params.toString()}`)
    if (!res.ok) throw new Error("Failed to fetch history telemetry")
    return res.json()
}

export async function fetchHistorySummary(siteId: string, assetId: string | null, start: number, end: number) {
    const params = new URLSearchParams({
        site_id: siteId,
        start: start.toString(), end: end.toString()
    })
    if (assetId) params.append("asset_id", assetId)
    const res = await fetch(`${API_URL}/api/history/summary?${params.toString()}`)
    if (!res.ok) throw new Error("Failed to fetch history summary")
    return res.json()
}

export async function fetchHistoryAlarms(siteId: string, assetId: string | null, start: number, end: number) {
    const params = new URLSearchParams({
        site_id: siteId,
        start: start.toString(), end: end.toString()
    })
    if (assetId) params.append("asset_id", assetId)
    const res = await fetch(`${API_URL}/api/history/alarms?${params.toString()}`)
    if (!res.ok) throw new Error("Failed to fetch history alarms")
    return res.json()
}

export function getExportUrl(siteId: string, assetId: string, start: number, end: number) {
    const params = new URLSearchParams({
        site_id: siteId, asset_id: assetId,
        start: start.toString(), end: end.toString()
    })
    return `${API_URL}/api/history/export?${params.toString()}`
}
