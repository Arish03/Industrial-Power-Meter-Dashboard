const mongoose = require("mongoose");

const appSettingsSchema = new mongoose.Schema(
    {
        darkMode: { type: Boolean, default: true },
        alarmSounds: { type: Boolean, default: false },
        autoReconnect: { type: Boolean, default: true },
        chartAnimations: { type: Boolean, default: false },
        dataRetention: { type: String, default: "30" },
        refreshRate: { type: String, default: "1000" },
        tempUnit: { type: String, default: "celsius" },
        timezone: { type: String, default: "Asia/Kolkata" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("AppSettings", appSettingsSchema);
