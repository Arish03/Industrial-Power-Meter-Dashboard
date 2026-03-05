const express = require("express");
const router = express.Router();
const { AzureOpenAI } = require("openai");

// ── Azure OpenAI client ───────────────────────────────────────────────────────
const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_KEY;
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-35-turbo";
const AZURE_OPENAI_API_VERSION = "2024-10-21"; // latest stable GA

function getClient() {
    if (!AZURE_OPENAI_KEY || !AZURE_OPENAI_ENDPOINT) {
        return null;
    }
    return new AzureOpenAI({
        apiKey: AZURE_OPENAI_KEY,
        endpoint: AZURE_OPENAI_ENDPOINT,
        deployment: AZURE_OPENAI_DEPLOYMENT,
        apiVersion: AZURE_OPENAI_API_VERSION,
    });
}

// ── Build system prompt with live device context ──────────────────────────────
function buildSystemPrompt(telemetry, alarms, info) {
    // Guard against explicit nulls sent before Socket.IO delivers device data
    telemetry = telemetry || {};
    alarms = alarms || [];
    info = info || {};
    const elec = telemetry?.elec || {};
    const energy = telemetry?.energy || {};
    const pq = telemetry?.pq || {};
    const health = telemetry?.health || {};
    const v = elec.v_ln_rms || {};
    const i = elec.i_rms || {};

    const activeAlarms = alarms.filter(a => !a.acknowledged);
    const alarmText = activeAlarms.length
        ? activeAlarms.map(a => `  - ${a.code} (${a.severity}): ${a.msg}`).join("\n")
        : "  - None";

    return `You are an expert industrial power quality analyst for LANSUB Technologies.
You help operators understand their power meter data, diagnose issues, and improve energy efficiency.
Be concise, professional, and practical. Use units in every answer.

LIVE DEVICE DATA (${info.site_id || "site01"} / ${info.asset_id || "pmu01"}):
Device: ${info.device_sn || "LANSUB-PMU"} | FW: ${info.fw_version || "N/A"} | ${info.phases || 3}-Phase

Electrical Measurements:
  Active Power:    ${elec.p_kw?.total ?? "--"} kW
  Reactive Power:  ${elec.q_kvar?.total ?? "--"} kVAR
  Apparent Power:  ${elec.s_kva?.total ?? "--"} kVA
  Power Factor:    ${elec.pf_total ?? "--"}
  Frequency:       ${elec.freq_hz ?? "--"} Hz

Phase Voltages (L-N RMS):
  Phase A: ${v.A ?? "--"} V | Phase B: ${v.B ?? "--"} V | Phase C: ${v.C ?? "--"} V

Phase Currents (RMS):
  Phase A: ${i.A ?? "--"} A | Phase B: ${i.B ?? "--"} A | Phase C: ${i.C ?? "--"} A

Power Quality:
  THD-V: ${pq.thd_v_pct_est ?? "--"}%  (limit: 5%)
  THD-I: ${pq.thd_i_pct_est ?? "--"}%  (limit: 15%)

Energy:
  Import Total: ${energy.import_kwh_total ?? "--"} kWh

Health:
  Signal (RSSI): ${health.rssi_dbm ?? "--"} dBm
  Uptime: ${health.uptime_s ?? "--"} seconds

Active Alarms:
${alarmText}

Nominal specs: ${info.nominal_v_ln || 230} V L-N, ${info.nominal_freq_hz || 50} Hz
Timestamp: ${telemetry?.ts_ms ? new Date(telemetry.ts_ms).toISOString() : "N/A"}`;
}

// ── GET /api/chat/deployments — lists all deployments (diagnostic) ────────────
router.get("/deployments", async (req, res) => {
    if (!AZURE_OPENAI_KEY || !AZURE_OPENAI_ENDPOINT) {
        return res.status(503).json({ error: "Azure OpenAI not configured in .env" });
    }
    try {
        const url = `${AZURE_OPENAI_ENDPOINT}openai/deployments?api-version=${AZURE_OPENAI_API_VERSION}`;
        const r = await fetch(url, { headers: { "api-key": AZURE_OPENAI_KEY } });
        const data = await r.json();
        const names = (data.value || []).map(d => ({ name: d.id, model: d.model?.name, status: d.status }));
        res.json({ current_deployment: AZURE_OPENAI_DEPLOYMENT, available: names });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/chat ────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
    const { message, history = [], telemetry, alarms, info } = req.body;

    if (!message?.trim()) {
        return res.status(400).json({ error: "Message is required" });
    }

    // Check if Azure OpenAI is configured
    const client = getClient();
    if (!client) {
        return res.status(503).json({
            error: "Azure OpenAI not configured",
            hint: "Set AZURE_OPENAI_KEY, AZURE_OPENAI_ENDPOINT, and AZURE_OPENAI_DEPLOYMENT in backend/.env",
        });
    }

    // Build messages array (system + history + new user message)
    const systemPrompt = buildSystemPrompt(telemetry, alarms, info);

    const messages = [
        { role: "system", content: systemPrompt },
        // Include last 10 messages for multi-turn context
        ...history.slice(-10).map(h => ({
            role: h.role,
            content: h.text,
        })),
        { role: "user", content: message },
    ];

    try {
        const response = await client.chat.completions.create({
            model: AZURE_OPENAI_DEPLOYMENT,
            messages,
            max_tokens: 600,
            temperature: 0.4,
        });

        const reply = response.choices[0]?.message?.content?.trim() || "I could not generate a response.";
        res.json({ reply });

    } catch (err) {
        console.error("❌ Azure OpenAI error:", err.message);
        if (err.status === 401) {
            res.status(401).json({ error: "Invalid Azure OpenAI API key. Check AZURE_OPENAI_KEY in .env" });
        } else if (err.status === 404) {
            res.status(404).json({ error: "Deployment not found. Check AZURE_OPENAI_DEPLOYMENT in .env" });
        } else {
            res.status(500).json({ error: "AI service error: " + err.message });
        }
    }
});

module.exports = router;
