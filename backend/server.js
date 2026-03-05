require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const mqtt = require("mqtt");

const Telemetry = require("./models/Telemetry");
const Status = require("./models/Status");
const Alarm = require("./models/Alarm");
const Info = require("./models/Info");
const Config = require("./models/Config");
const apiRoutes = require("./routes/api");

// ─── Express + HTTP + Socket.IO Setup ────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

app.use(cors());
app.use(express.json());

// ─── REST API Routes ──────────────────────────────────────────────────────────
app.use("/api", apiRoutes);

// Health check
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        mqtt: mqttConnected,
        mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
        uptime: process.uptime(),
    });
});

// ─── MongoDB Connection ───────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/pmu";
mongoose
    .connect(MONGODB_URI)
    .then(() => console.log("✅ MongoDB connected:", MONGODB_URI))
    .catch((err) => console.error("❌ MongoDB error:", err.message));

// ─── MQTT Threshold Alarm Engine ──────────────────────────────────────────

let alarmThresholds = {
    warn_pf: 0.90, crit_pf: 0.85,
    warn_thd_v: 5.0, crit_thd_v: 8.0,
    warn_v_dev_pct: 10.0, crit_v_dev_pct: 15.0,
    warn_i_a: 40.0, crit_i_a: 50.0,
    warn_freq_dev: 0.5, crit_freq_dev: 1.0,
    nominalV: 230, nominalFreq: 50
};

// Site-asset specific cooldowns to prevent alarm flapping
const activeAlarms = new Map();
const ALARM_COOLDOWN = 60 * 1000; // 1 minute cooldown

async function loadThresholds() {
    try {
        const config = await Config.findOne().lean();
        if (config) {
            alarmThresholds = { ...alarmThresholds, ...config };
            ["warn_pf", "crit_pf", "warn_thd_v", "crit_thd_v", "warn_v_dev_pct", "crit_v_dev_pct", "warn_i_a", "crit_i_a", "warn_freq_dev", "crit_freq_dev", "nominalV", "nominalFreq"].forEach(k => {
                if (alarmThresholds[k] != null) alarmThresholds[k] = parseFloat(alarmThresholds[k]);
            });
        }
    } catch (err) { console.error("Error loading thresholds:", err.message); }
}

loadThresholds();
setInterval(loadThresholds, 30000);

async function processThresholdAlarms(site_id, asset_id, payload) {
    if (!payload?.elec) return;
    const { elec, pq } = payload;
    const { pf_total, freq_hz, v_ln_rms, i_rms } = elec;
    const thd_v = pq?.thd_v_pct_est;
    const checks = [];

    if (pf_total != null) {
        if (pf_total < alarmThresholds.crit_pf) checks.push({ code: "CRIT_LOW_PF", msg: `Critical: PF is ${pf_total.toFixed(3)} (threshold ${alarmThresholds.crit_pf})`, severity: "critical" });
        else if (pf_total < alarmThresholds.warn_pf) checks.push({ code: "WARN_LOW_PF", msg: `Warning: PF is ${pf_total.toFixed(3)} (threshold ${alarmThresholds.warn_pf})`, severity: "warning" });
    }
    if (thd_v != null) {
        if (thd_v > alarmThresholds.crit_thd_v) checks.push({ code: "CRIT_HIGH_THD_V", msg: `Critical: THD-V is ${thd_v.toFixed(1)}% (limit ${alarmThresholds.crit_thd_v}%)`, severity: "critical" });
        else if (thd_v > alarmThresholds.warn_thd_v) checks.push({ code: "WARN_HIGH_THD_V", msg: `Warning: THD-V is ${thd_v.toFixed(1)}% (limit ${alarmThresholds.warn_thd_v}%)`, severity: "warning" });
    }
    if (v_ln_rms) {
        const nominalV = alarmThresholds.nominalV || 230;
        const wTol = (alarmThresholds.warn_v_dev_pct || 10) / 100;
        const cTol = (alarmThresholds.crit_v_dev_pct || 15) / 100;
        ["A", "B", "C"].forEach(ph => {
            const v = v_ln_rms[ph];
            if (v != null) {
                if (v < nominalV * (1 - cTol) || v > nominalV * (1 + cTol)) {
                    checks.push({ code: "CRIT_VOLTAGE_ANOMALY", msg: `Critical: Phase ${ph} voltage is ${v.toFixed(1)}V (nominal ${nominalV}V ±${alarmThresholds.crit_v_dev_pct}%)`, severity: "critical" });
                } else if (v < nominalV * (1 - wTol) || v > nominalV * (1 + wTol)) {
                    checks.push({ code: "WARN_VOLTAGE_ANOMALY", msg: `Warning: Phase ${ph} voltage is ${v.toFixed(1)}V (nominal ${nominalV}V ±${alarmThresholds.warn_v_dev_pct}%)`, severity: "warning" });
                }
            }
        });
    }
    if (i_rms) {
        const wLimit = alarmThresholds.warn_i_a || 40;
        const cLimit = alarmThresholds.crit_i_a || 50;
        ["A", "B", "C"].forEach(ph => {
            const i = i_rms[ph];
            if (i != null) {
                if (i > cLimit) checks.push({ code: "CRIT_OVERCURRENT", msg: `Critical: Phase ${ph} current is ${i.toFixed(1)}A (limit ${cLimit}A)`, severity: "critical" });
                else if (i > wLimit) checks.push({ code: "WARN_OVERCURRENT", msg: `Warning: Phase ${ph} current is ${i.toFixed(1)}A (limit ${wLimit}A)`, severity: "warning" });
            }
        });
    }
    if (freq_hz != null) {
        const nominalF = alarmThresholds.nominalFreq || 50;
        const dev = Math.abs(freq_hz - nominalF);
        if (dev > alarmThresholds.crit_freq_dev) checks.push({ code: "CRIT_FREQ_DRIFT", msg: `Critical: Frequency is ${freq_hz.toFixed(2)}Hz (nominal ${nominalF}Hz ±${alarmThresholds.crit_freq_dev}Hz)`, severity: "critical" });
        else if (dev > alarmThresholds.warn_freq_dev) checks.push({ code: "WARN_FREQ_DRIFT", msg: `Warning: Frequency is ${freq_hz.toFixed(2)}Hz (nominal ${nominalF}Hz ±${alarmThresholds.warn_freq_dev}Hz)`, severity: "warning" });
    }

    for (const check of checks) {
        const alarmKey = `${site_id}:${asset_id}:${check.code}`;
        const now = Date.now();
        if (!activeAlarms.has(alarmKey) || (now - activeAlarms.get(alarmKey)) > ALARM_COOLDOWN) {
            try {
                const doc = await Alarm.create({ ...check, site_id, asset_id });
                io.emit("alarm", doc.toObject());
                console.log(`🚨 Alarm [AUTO] | ${site_id}/${asset_id} | ${check.code}: ${check.msg}`);
                activeAlarms.set(alarmKey, now);
            } catch (err) { console.error("Failed to store auto-alarm:", err.message); }
        }
    }
}

// ─── MQTT Client ─────────────────────────────────────────────────────────────
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";
let mqttConnected = false;

const mqttClient = mqtt.connect(MQTT_BROKER_URL, {
    clientId: `pmu-backend-${Date.now()}`,
    reconnectPeriod: 5000,
    connectTimeout: 10000,
});

mqttClient.on("connect", () => {
    mqttConnected = true;
    console.log("✅ Connected to MQTT broker:", MQTT_BROKER_URL);
    mqttClient.subscribe("lansub/#", (err) => {
        if (err) {
            console.error("❌ MQTT subscribe error:", err.message);
        } else {
            console.log("📡 Subscribed to: lansub/#");
        }
    });
});

mqttClient.on("reconnect", () => {
    console.log("🔄 Reconnecting to MQTT broker...");
});

mqttClient.on("error", (err) => {
    mqttConnected = false;
    console.error("❌ MQTT error:", err.message);
});

mqttClient.on("offline", () => {
    mqttConnected = false;
    console.warn("⚠️  MQTT broker offline");
});

// ─── Device Timeout Tracking ──────────────────────────────────────────────────
const deviceTimeouts = {};

function resetDeviceTimeout(site_id, asset_id) {
    const key = `${site_id}/${asset_id}`;

    // Clear existing timeout if it exists
    if (deviceTimeouts[key]) {
        clearTimeout(deviceTimeouts[key]);
    }

    // Set a new timeout for 10 seconds
    deviceTimeouts[key] = setTimeout(async () => {
        console.log(`⚠️  Device Timeout | ${site_id}/${asset_id} | State: offline`);
        try {
            const doc = await Status.create({
                site_id,
                asset_id,
                state: "offline",
                ts_ms: Date.now()
            });
            io.emit("status", doc.toObject());
        } catch (err) {
            console.error("❌ Failed to log offline status:", err.message);
        }
    }, 10000);
}

// ─── MQTT Message Handler ─────────────────────────────────────────────────────
mqttClient.on("message", async (topic, message) => {
    let payload;
    try {
        payload = JSON.parse(message.toString());
    } catch {
        console.warn("⚠️  Non-JSON message on topic:", topic);
        return;
    }

    // Parse topic: lansub/<site_id>/<asset_id>/<type>
    const parts = topic.split("/");
    if (parts.length < 4) return;

    const [, site_id, asset_id, messageType] = parts;

    // Any valid message resets the device's online timeout
    resetDeviceTimeout(site_id, asset_id);

    try {
        switch (messageType) {
            case "telemetry": {
                const doc = await Telemetry.create({
                    ...payload,
                    site_id,
                    asset_id,
                });
                io.emit("telemetry", doc.toObject());

                // Process server-side thresholds
                processThresholdAlarms(site_id, asset_id, payload);

                // If we get telemetry, also assure device is marked online
                const statusDoc = await Status.create({
                    site_id,
                    asset_id,
                    state: "online",
                    ts_ms: Date.now()
                });
                io.emit("status", statusDoc.toObject());

                // Keep telemetry log clean
                // console.log(`📊 Telemetry | ${site_id}/${asset_id} | P: ${payload?.elec?.p_kw?.total ?? "?"}kW`);

                // Process server-side thresholds
                processThresholdAlarms(site_id, asset_id, payload);
                break;
            }

            case "status": {
                const doc = await Status.create({
                    ...payload,
                    site_id,
                    asset_id,
                });
                io.emit("status", doc.toObject());
                console.log(`💡 Status   | ${site_id}/${asset_id} | State: ${payload.state}`);
                break;
            }

            case "info": {
                // Upsert – only one info doc per asset
                const doc = await Info.findOneAndUpdate(
                    { site_id, asset_id },
                    { ...payload, site_id, asset_id },
                    { upsert: true, new: true }
                );
                io.emit("info", doc.toObject());
                console.log(`ℹ️  Info     | ${site_id}/${asset_id} | FW: ${payload.fw_version}`);
                break;
            }

            case "alarms": {
                const doc = await Alarm.create({
                    ...payload,
                    site_id,
                    asset_id,
                });
                io.emit("alarm", doc.toObject());
                console.log(`🚨 Alarm    | ${site_id}/${asset_id} | ${payload.code}: ${payload.msg}`);
                break;
            }

            default:
                console.log(`❓ Unknown topic type: ${messageType}`);
        }
    } catch (err) {
        console.error("❌ DB save error:", err.message);
    }
});

// ─── Socket.IO Connection ─────────────────────────────────────────────────────
io.on("connection", async (socket) => {
    console.log(`🔌 Frontend connected: ${socket.id}`);

    // Send last known state to newly connected client
    try {
        const [latestTelemetry, latestStatus, recentAlarms, deviceInfo] =
            await Promise.all([
                Telemetry.findOne().sort({ createdAt: -1 }).lean(),
                Status.findOne().sort({ createdAt: -1 }).lean(),
                Alarm.find().sort({ createdAt: -1 }).limit(20).lean(),
                Info.findOne().sort({ createdAt: -1 }).lean(),
            ]);

        if (latestTelemetry) socket.emit("telemetry", latestTelemetry);
        if (latestStatus) socket.emit("status", latestStatus);
        if (recentAlarms.length) socket.emit("alarms:history", recentAlarms);
        if (deviceInfo) socket.emit("info", deviceInfo);
    } catch (err) {
        console.error("❌ Error sending initial state:", err.message);
    }

    socket.on("disconnect", () => {
        console.log(`🔌 Frontend disconnected: ${socket.id}`);
    });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`   REST API: http://localhost:${PORT}/api`);
    console.log(`   Health:   http://localhost:${PORT}/health`);
});
