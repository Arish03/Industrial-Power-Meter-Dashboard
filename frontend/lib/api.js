const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

async function apiFetch(path) {
    const res = await fetch(`${BACKEND_URL}/api${path}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
}

export const getTelemetry = (limit = 60) => apiFetch(`/telemetry?limit=${limit}`);
export const getStatus = () => apiFetch("/status");
export const getAlarms = (limit = 20) => apiFetch(`/alarms?limit=${limit}`);
export const getInfo = () => apiFetch("/info");
