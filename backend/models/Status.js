const mongoose = require("mongoose");

const statusSchema = new mongoose.Schema(
    {
        ts_ms: { type: Number },
        site_id: { type: String, default: "site01" },
        asset_id: { type: String, default: "pmu01" },
        state: { type: String, enum: ["online", "offline"], default: "offline" },
        rssi_dbm: { type: Number },
        ip: { type: String },
        uptime_s: { type: Number },
    },
    { timestamps: true }
);

statusSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Status", statusSchema);
