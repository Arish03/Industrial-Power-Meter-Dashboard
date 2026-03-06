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
        // Alarm Thresholds (Warning & Critical Pairs)
        warn_pf: { type: Number, default: 0.90 },
        crit_pf: { type: Number, default: 0.85 },

        warn_thd_v: { type: Number, default: 5.0 },
        crit_thd_v: { type: Number, default: 8.0 },

        warn_v_dev_pct: { type: Number, default: 10.0 },
        crit_v_dev_pct: { type: Number, default: 15.0 },

        warn_i_a: { type: Number, default: 40.0 },
        crit_i_a: { type: Number, default: 50.0 },

        warn_freq_dev: { type: Number, default: 0.5 },
        crit_freq_dev: { type: Number, default: 1.0 },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Config", configSchema);
