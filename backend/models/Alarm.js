const mongoose = require("mongoose");

const alarmSchema = new mongoose.Schema(
    {
        ts_ms: { type: Number },
        site_id: { type: String, default: "site01" },
        asset_id: { type: String, default: "pmu01" },
        severity: {
            type: String,
            enum: ["info", "warning", "critical"],
            default: "warning",
        },
        code: { type: String },
        msg: { type: String },
        threshold_a: { type: Number },
        phases_a: {
            A: Number,
            B: Number,
            C: Number,
        },
        acknowledged: { type: Boolean, default: false },
    },
    { timestamps: true }
);

alarmSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Alarm", alarmSchema);
