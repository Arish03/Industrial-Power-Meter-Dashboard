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
        const query = {};
        if (req.query.site_id) query.site_id = req.query.site_id;
        if (req.query.asset_id) query.asset_id = req.query.asset_id;

        const data = await Telemetry.find(query).sort({ createdAt: -1 }).limit(limit).lean();
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET latest device status
router.get("/status", async (req, res) => {
    try {
        const query = {};
        if (req.query.site_id) query.site_id = req.query.site_id;
        if (req.query.asset_id) query.asset_id = req.query.asset_id;

        const data = await Status.findOne(query).sort({ createdAt: -1 }).lean();
        res.json(data || { state: "unknown" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET unique devices active recently
router.get("/devices", async (req, res) => {
    try {
        const devices = await Telemetry.aggregate([
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: { site_id: "$site_id", asset_id: "$asset_id" },
                    latestReading: { $first: "$$ROOT" }
                }
            },
            {
                $project: {
                    _id: 0,
                    site_id: "$_id.site_id",
                    asset_id: "$_id.asset_id",
                    latestData: "$latestReading"
                }
            }
        ]);

        // Group by site internally for UI convenience
        const bySite = devices.reduce((acc, dev) => {
            if (!acc[dev.site_id]) acc[dev.site_id] = [];
            acc[dev.site_id].push({ asset_id: dev.asset_id, latestData: dev.latestData });
            return acc;
        }, {});

        res.json(bySite);
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

// ── Dashboard / Site-Level Aggregation ────────────────────────────────────────

// Helper: bucket size from range
function getBucketMs(rangeMs) {
    if (rangeMs <= 24 * 3600000) return 60000;        // ≤24h → 1 min
    if (rangeMs <= 7 * 24 * 3600000) return 600000;   // ≤7d → 10 min
    return 3600000;                                     // else → 1 hour
}

// GET site-level summary KPIs
router.get("/dashboard/summary", async (req, res) => {
    try {
        const { site_id, start, end, asset_id } = req.query;
        if (!site_id || !start || !end) return res.status(400).json({ error: "site_id, start, end required" });

        // Lenient time filter: data up to 1 hour in the future is allowed to account for clock skew
        const match = { site_id, createdAt: { $gte: new Date(+start), $lte: new Date(+end + 3600000) } };
        if (asset_id) match.asset_id = asset_id;

        // 1. KPI Aggregation per meter
        const kpiResult = await Telemetry.aggregate([
            { $match: match },
            { $sort: { createdAt: 1 } },
            {
                $group: {
                    _id: "$asset_id",
                    count: { $sum: 1 },
                    avg_kw: { $avg: "$elec.p_kw.total" },
                    avg_pf: { $avg: "$elec.pf_total" },
                    min_pf: { $min: "$elec.pf_total" },
                    sum_p: { $sum: "$elec.p_kw.total" },
                    sum_s: { $sum: "$elec.s_kva.total" },
                    avg_thd_v: { $avg: "$pq.thd_v_pct_est" },
                    avg_thd_i: { $avg: "$pq.thd_i_pct_est" },
                    max_thd_v: { $max: "$pq.thd_v_pct_est" },
                    first_kwh: { $first: "$energy.import_kwh_total" },
                    last_kwh: { $last: "$energy.import_kwh_total" }
                }
            }
        ]);

        // 2. Simultaneous Peak Demand (Site Peak = Max of simultaneous sum)
        // We bucket by 1-minute intervals to align data points across meters
        const peakResult = await Telemetry.aggregate([
            { $match: match },
            {
                $group: {
                    _id: {
                        ts: { $subtract: [{ $toLong: "$createdAt" }, { $mod: [{ $toLong: "$createdAt" }, 60000] }] }
                    },
                    similtaneous_p: { $sum: "$elec.p_kw.total" }
                }
            },
            { $group: { _id: null, site_peak: { $max: "$similtaneous_p" } } }
        ]);

        const site_peak = peakResult[0]?.site_peak || 0;

        // Aggregate across meters
        let total_kwh = 0, total_avg_kw = 0, total_count = 0;
        let pf_sum_p = 0, pf_sum_s = 0;
        let thd_v_sum = 0, thd_i_sum = 0, max_thd_v = 0;
        let min_pf = 1;
        const perMeter = {};

        kpiResult.forEach(m => {
            let kwh = (m.last_kwh || 0) - (m.first_kwh || 0);
            if (kwh < 0) kwh = 0; // Prevent negative energy on meter rollover or reset
            total_kwh += kwh;
            total_avg_kw += m.avg_kw || 0;
            total_count += m.count;
            pf_sum_p += m.sum_p || 0;
            pf_sum_s += m.sum_s || 0;
            thd_v_sum += m.avg_thd_v || 0;
            thd_i_sum += m.avg_thd_i || 0;
            if ((m.max_thd_v || 0) > max_thd_v) max_thd_v = m.max_thd_v;
            if (m.min_pf != null && m.min_pf < min_pf) min_pf = m.min_pf;
            perMeter[m._id] = { kwh, avg_kw: m.avg_kw, count: m.count };
        });

        const n = kpiResult.length || 1;
        res.json({
            total_kwh,
            avg_kw: total_avg_kw,
            max_kw: site_peak,
            pf_weighted: pf_sum_s > 0 ? pf_sum_p / pf_sum_s : null,
            avg_pf: kpiResult.reduce((s, m) => s + (m.avg_pf || 0), 0) / n,
            min_pf,
            avg_thd_v: thd_v_sum / n,
            avg_thd_i: thd_i_sum / n,
            max_thd_v,
            count: total_count,
            perMeter
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET site-level trend (aggregated kW across meters, bucketed)
router.get("/dashboard/trend", async (req, res) => {
    try {
        const { site_id, start, end, asset_id } = req.query;
        if (!site_id || !start || !end) return res.status(400).json({ error: "site_id, start, end required" });

        const startDate = new Date(+start);
        const endDate = new Date(+end + 3600000); // 1h buffer
        const match = { site_id, createdAt: { $gte: startDate, $lte: endDate } };
        if (asset_id) match.asset_id = asset_id;

        const bucketMs = getBucketMs(+end - +start);

        const data = await Telemetry.aggregate([
            { $match: match },
            // First average per meter per bucket to handle uneven sampling
            {
                $group: {
                    _id: {
                        bucket: { $subtract: [{ $toLong: "$createdAt" }, { $mod: [{ $toLong: "$createdAt" }, bucketMs] }] },
                        asset_id: "$asset_id"
                    },
                    avg_p: { $avg: "$elec.p_kw.total" },
                    avg_pf: { $avg: "$elec.pf_total" },
                    avg_thd: { $avg: "$pq.thd_v_pct_est" },
                    avg_freq: { $avg: "$elec.freq_hz" }
                }
            },
            // Then sum or average across METERS for the site total
            {
                $group: {
                    _id: "$_id.bucket",
                    p_kw: { $sum: "$avg_p" },      // Site Total = Sum of meters
                    pf: { $avg: "$avg_pf" },       // Site PF = Avg across meters (or weighted)
                    thd_v: { $avg: "$avg_thd" },
                    freq: { $avg: "$avg_freq" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } },
            { $project: { _id: 0, time: "$_id", p_kw: 1, pf: 1, thd_v: 1, freq: 1, count: 1 } }
        ]);

        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET demand profile with peak detection
router.get("/dashboard/demand", async (req, res) => {
    try {
        const { site_id, start, end, asset_id } = req.query;
        if (!site_id || !start || !end) return res.status(400).json({ error: "site_id, start, end required" });

        const startDate = new Date(+start);
        const endDate = new Date(+end + 3600000); // 1h buffer
        const match = { site_id, createdAt: { $gte: startDate, $lte: endDate } };
        if (asset_id) match.asset_id = asset_id;

        const bucketMs = getBucketMs(+end - +start);

        const data = await Telemetry.aggregate([
            { $match: match },
            {
                $group: {
                    _id: {
                        bucket: { $subtract: [{ $toLong: "$createdAt" }, { $mod: [{ $toLong: "$createdAt" }, bucketMs] }] },
                        asset_id: "$asset_id"
                    },
                    avg_kw: { $avg: "$elec.p_kw.total" },
                }
            },
            {
                $group: {
                    _id: "$_id.bucket",
                    total_kw: { $sum: "$avg_kw" },
                    meters: { $push: { asset_id: "$_id.asset_id", kw: "$avg_kw" } }
                }
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, time: "$_id", total_kw: 1, meters: 1 } }
        ]);

        // Find peak
        let peak = { kw: 0, time: null, topMeter: null };
        data.forEach(d => {
            if (d.total_kw > peak.kw) {
                peak.kw = d.total_kw;
                peak.time = d.time;
                const sorted = (d.meters || []).sort((a, b) => b.kw - a.kw);
                peak.topMeter = sorted[0]?.asset_id || null;
            }
        });

        res.json({ trend: data, peak });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── History / Analytics ───────────────────────────────────────────────────────

// GET downsampled telemetry for a time range
// asset_id is optional: if omitted, returns per-meter breakdown
router.get("/history/telemetry", async (req, res) => {
    try {
        const { site_id, asset_id, start, end, buckets } = req.query;
        if (!site_id || !start || !end) {
            return res.status(400).json({ error: "site_id, start, end are required" });
        }

        const startDate = new Date(parseInt(start));
        const endDate = new Date(parseInt(end));
        const numBuckets = parseInt(buckets) || 120;
        const match = { site_id, createdAt: { $gte: startDate, $lte: endDate } };
        if (asset_id) match.asset_id = asset_id;

        // If no asset_id, return per-meter data using time-bucket grouping
        if (!asset_id) {
            const bucketMs = getBucketMs(parseInt(end) - parseInt(start));
            const data = await Telemetry.aggregate([
                { $match: match },
                { $sort: { createdAt: 1 } },
                {
                    $group: {
                        _id: {
                            bucket: { $subtract: [{ $toLong: "$createdAt" }, { $mod: [{ $toLong: "$createdAt" }, bucketMs] }] },
                            asset_id: "$asset_id"
                        },
                        p_kw: { $avg: "$elec.p_kw.total" },
                        pf: { $avg: "$elec.pf_total" },
                        freq: { $avg: "$elec.freq_hz" },
                        thd_v: { $avg: "$pq.thd_v_pct_est" },
                        thd_i: { $avg: "$pq.thd_i_pct_est" },
                        v_a: { $avg: "$elec.v_ln_rms.A" },
                        v_b: { $avg: "$elec.v_ln_rms.B" },
                        v_c: { $avg: "$elec.v_ln_rms.C" },
                    }
                },
                { $sort: { "_id.bucket": 1 } },
                {
                    $project: {
                        _id: 0,
                        time: "$_id.bucket",
                        asset_id: "$_id.asset_id",
                        p_kw: 1, pf: 1, freq: 1,
                        thd_v: 1, thd_i: 1,
                        v_a: 1, v_b: 1, v_c: 1
                    }
                }
            ]);

            // Pivot: merge per-meter data into rows keyed by time
            const timeMap = {};
            data.forEach(d => {
                if (!timeMap[d.time]) timeMap[d.time] = { time: d.time };
                const row = timeMap[d.time];
                row[`${d.asset_id}_kw`] = d.p_kw;
                row[`${d.asset_id}_pf`] = d.pf;
                row[`${d.asset_id}_freq`] = d.freq;
                row[`${d.asset_id}_thd_v`] = d.thd_v;
                row[`${d.asset_id}_v_a`] = d.v_a;
                row[`${d.asset_id}_v_b`] = d.v_b;
                row[`${d.asset_id}_v_c`] = d.v_c;
            });

            // Extract unique meter IDs
            const meterIds = [...new Set(data.map(d => d.asset_id))];
            const pivoted = Object.values(timeMap).sort((a, b) => a.time - b.time);
            return res.json({ mode: "multi", meterIds, data: pivoted });
        }

        // Single meter mode: use $bucketAuto for smooth downsampling
        const data = await Telemetry.aggregate([
            { $match: match },
            { $sort: { createdAt: 1 } },
            {
                $bucketAuto: {
                    groupBy: "$createdAt",
                    buckets: numBuckets,
                    output: {
                        ts_ms: { $avg: "$ts_ms" },
                        p_kw: { $avg: "$elec.p_kw.total" },
                        q_kvar: { $avg: "$elec.q_kvar.total" },
                        s_kva: { $avg: "$elec.s_kva.total" },
                        pf: { $avg: "$elec.pf_total" },
                        freq: { $avg: "$elec.freq_hz" },
                        v_a: { $avg: "$elec.v_ln_rms.A" },
                        v_b: { $avg: "$elec.v_ln_rms.B" },
                        v_c: { $avg: "$elec.v_ln_rms.C" },
                        i_a: { $avg: "$elec.i_rms.A" },
                        i_b: { $avg: "$elec.i_rms.B" },
                        i_c: { $avg: "$elec.i_rms.C" },
                        thd_v: { $avg: "$pq.thd_v_pct_est" },
                        thd_i: { $avg: "$pq.thd_i_pct_est" },
                        kwh: { $last: "$energy.import_kwh_total" },
                        count: { $sum: 1 }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    time: { $toLong: "$_id.min" },
                    ts_ms: 1, p_kw: 1, q_kvar: 1, s_kva: 1,
                    pf: 1, freq: 1,
                    v_a: 1, v_b: 1, v_c: 1,
                    i_a: 1, i_b: 1, i_c: 1,
                    thd_v: 1, thd_i: 1, kwh: 1, count: 1
                }
            }
        ]);

        res.json({ mode: "single", data });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET summary stats for a time range
router.get("/history/summary", async (req, res) => {
    try {
        const { site_id, asset_id, start, end } = req.query;
        if (!site_id || !start || !end) {
            return res.status(400).json({ error: "site_id, start, end are required" });
        }

        const startDate = new Date(parseInt(start));
        const endDate = new Date(parseInt(end));

        const match = { site_id, createdAt: { $gte: startDate, $lte: endDate } };
        if (asset_id) match.asset_id = asset_id;

        const result = await Telemetry.aggregate([
            { $match: match },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    avg_kw: { $avg: "$elec.p_kw.total" },
                    min_kw: { $min: "$elec.p_kw.total" },
                    max_kw: { $max: "$elec.p_kw.total" },
                    avg_pf: { $avg: "$elec.pf_total" },
                    min_pf: { $min: "$elec.pf_total" },
                    max_pf: { $max: "$elec.pf_total" },
                    avg_thd_v: { $avg: "$pq.thd_v_pct_est" },
                    max_thd_v: { $max: "$pq.thd_v_pct_est" },
                    avg_freq: { $avg: "$elec.freq_hz" },
                    min_freq: { $min: "$elec.freq_hz" },
                    max_freq: { $max: "$elec.freq_hz" }
                }
            },
            {
                $project: {
                    _id: 0,
                    count: 1,
                    kw: { avg: "$avg_kw", min: "$min_kw", max: "$max_kw" },
                    pf: { avg: "$avg_pf", min: "$min_pf", max: "$max_pf" },
                    thd_v: { avg: "$avg_thd_v", max: "$max_thd_v" },
                    freq: { avg: "$avg_freq", min: "$min_freq", max: "$max_freq" }
                }
            }
        ]);

        // Calculate energy consumed precisely per meter
        const energyResult = await Telemetry.aggregate([
            { $match: match },
            { $sort: { ts_ms: 1 } },
            {
                $group: {
                    _id: "$asset_id",
                    first_kwh: { $first: "$energy.import_kwh_total" },
                    last_kwh: { $last: "$energy.import_kwh_total" }
                }
            }
        ]);

        let totalEnergy = 0;
        energyResult.forEach(e => {
            if (e.first_kwh != null && e.last_kwh != null) {
                let diff = e.last_kwh - e.first_kwh;
                if (diff > 0) totalEnergy += diff;
            }
        });

        const finalData = result[0] || { count: 0 };
        finalData.energy_kwh = totalEnergy;

        res.json(finalData);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET alarms in a time range
router.get("/history/alarms", async (req, res) => {
    try {
        const { site_id, asset_id, start, end, limit: lim } = req.query;
        if (!site_id || !start || !end) {
            return res.status(400).json({ error: "site_id, start, end are required" });
        }

        const startDate = new Date(parseInt(start));
        const endDate = new Date(parseInt(end));
        const maxItems = parseInt(lim) || 200;

        const query = { site_id, createdAt: { $gte: startDate, $lte: endDate } };
        if (asset_id) query.asset_id = asset_id;

        const data = await Alarm.find(query).sort({ createdAt: -1 }).limit(maxItems).lean();

        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET telemetry for CSV export (no downsampling)
router.get("/history/export", async (req, res) => {
    try {
        const { site_id, asset_id, start, end } = req.query;
        if (!site_id || !asset_id || !start || !end) {
            return res.status(400).json({ error: "site_id, asset_id, start, end are required" });
        }

        const startDate = new Date(parseInt(start));
        const endDate = new Date(parseInt(end));

        const data = await Telemetry.find({
            site_id,
            asset_id,
            createdAt: { $gte: startDate, $lte: endDate }
        }).sort({ createdAt: 1 }).lean();

        // Build CSV
        const header = "Timestamp,kW,kVAr,kVA,PF,Freq_Hz,V_A,V_B,V_C,I_A,I_B,I_C,THD_V%,THD_I%,kWh_Total\n";
        const rows = data.map(d => {
            const e = d.elec || {};
            return [
                new Date(d.createdAt).toISOString(),
                e.p_kw?.total ?? "", e.q_kvar?.total ?? "", e.s_kva?.total ?? "",
                e.pf_total ?? "", e.freq_hz ?? "",
                e.v_ln_rms?.A ?? "", e.v_ln_rms?.B ?? "", e.v_ln_rms?.C ?? "",
                e.i_rms?.A ?? "", e.i_rms?.B ?? "", e.i_rms?.C ?? "",
                d.pq?.thd_v_pct_est ?? "", d.pq?.thd_i_pct_est ?? "",
                d.energy?.import_kwh_total ?? ""
            ].join(",");
        }).join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=${site_id}_${asset_id}_export.csv`);
        res.send(header + rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
