const mongoose = require("mongoose");

const telemetrySchema = new mongoose.Schema(
  {
    ts_ms: { type: Number },
    site_id: { type: String, default: "site01" },
    asset_id: { type: String, default: "pmu01" },
    device_sn: { type: String },
    elec: {
      phases: Number,
      freq_hz: Number,
      v_ln_rms: {
        A: Number,
        B: Number,
        C: Number,
      },
      i_rms: {
        A: Number,
        B: Number,
        C: Number,
      },
      p_kw: {
        total: Number,
      },
      q_kvar: {
        total: Number,
      },
      s_kva: {
        total: Number,
      },
      pf_total: Number,
    },
    energy: {
      import_kwh_total: Number,
    },
    pq: {
      thd_v_pct_est: Number,
      thd_i_pct_est: Number,
    },
    health: {
      rssi_dbm: Number,
      uptime_s: Number,
    },
  },
  { timestamps: true }
);

// Index for fast recent-data queries
telemetrySchema.index({ createdAt: -1 });

module.exports = mongoose.model("Telemetry", telemetrySchema);
