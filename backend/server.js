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
const apiRoutes = require("./routes/api");
const chatRoutes = require("./routes/chat");

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
app.use("/api/chat", chatRoutes);


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

    try {
        switch (messageType) {
            case "telemetry": {
                const doc = await Telemetry.create({
                    ...payload,
                    site_id,
                    asset_id,
                });
                io.emit("telemetry", doc.toObject());
                console.log(`📊 Telemetry | ${site_id}/${asset_id} | P: ${payload?.elec?.p_kw?.total ?? "?"}kW`);
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
