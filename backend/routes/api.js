const express = require("express");
const router = express.Router();
const Telemetry = require("../models/Telemetry");
const Status = require("../models/Status");
const Alarm = require("../models/Alarm");
const Info = require("../models/Info");
const Config = require("../models/Config");
const AppSettings = require("../models/AppSettings");

// GET latest telemetry readings
router.get("/telemetry", async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const data = await Telemetry.find().sort({ createdAt: -1 }).limit(limit).lean();
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET latest device status
router.get("/status", async (req, res) => {
    try {
        const data = await Status.findOne().sort({ createdAt: -1 }).lean();
        res.json(data || { state: "unknown" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET latest alarms
router.get("/alarms", async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const data = await Alarm.find().sort({ createdAt: -1 }).limit(limit).lean();
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET device info
router.get("/info", async (req, res) => {
    try {
        const data = await Info.findOne().sort({ createdAt: -1 }).lean();
        res.json(data || {});
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH acknowledge alarm
router.patch("/alarms/:id/acknowledge", async (req, res) => {
    try {
        const alarm = await Alarm.findByIdAndUpdate(req.params.id, { acknowledged: true }, { new: true });
        res.json(alarm);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Config ────────────────────────────────────────────────────────────────────

router.get("/config", async (req, res) => {
    try {
        let config = await Config.findOne().lean();
        if (!config) {
            config = {
                brokerUrl: process.env.MQTT_BROKER_URL || "mqtt://localhost:1883",
                siteId: "site01", assetId: "pmu01",
                phases: "3", nominalV: "230", nominalFreq: "50",
                telemetryInterval: "1000",
            };
        }
        res.json(config);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/config", async (req, res) => {
    try {
        const config = await Config.findOneAndUpdate({}, { $set: req.body }, { upsert: true, new: true });
        res.json({ success: true, config });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── App Settings ──────────────────────────────────────────────────────────────

router.get("/settings", async (req, res) => {
    try {
        let settings = await AppSettings.findOne().lean();
        if (!settings) {
            settings = {
                darkMode: true, alarmSounds: false, autoReconnect: true,
                chartAnimations: false, dataRetention: "30",
                refreshRate: "1000", tempUnit: "celsius", timezone: "Asia/Kolkata",
            };
        }
        res.json(settings);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/settings", async (req, res) => {
    try {
        const settings = await AppSettings.findOneAndUpdate({}, { $set: req.body }, { upsert: true, new: true });
        res.json({ success: true, settings });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
