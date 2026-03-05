const mongoose = require("mongoose");

const infoSchema = new mongoose.Schema(
    {
        site_id: { type: String, default: "site01" },
        asset_id: { type: String, default: "pmu01" },
        device_sn: { type: String },
        device_type: { type: String },
        fw_version: { type: String },
        hw: { type: String },
        phases: { type: Number },
        nominal_v_ln: { type: Number },
        nominal_freq_hz: { type: Number },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Info", infoSchema);
