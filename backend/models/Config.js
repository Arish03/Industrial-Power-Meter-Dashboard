const mongoose = require("mongoose");

const configSchema = new mongoose.Schema(
    {
        brokerUrl: { type: String, default: "mqtt://localhost:1883" },
        siteId: { type: String, default: "site01" },
        assetId: { type: String, default: "pmu01" },
        phases: { type: String, default: "3" },
        nominalV: { type: String, default: "230" },
        nominalFreq: { type: String, default: "50" },
        telemetryInterval: { type: String, default: "1000" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Config", configSchema);
