/**
 * PMU MQTT Simulator
 * ─────────────────────────────────────────────────────────────────────────────
 * Publishes realistic fake ESP32 telemetry to your MQTT broker so you can
 * test the full pipeline without physical hardware.
 *
 * Usage:
 *   node simulate.js                          (connects to localhost:1883)
 *   MQTT_BROKER=mqtt://20.x.x.x:1883 node simulate.js  (Azure VM broker)
 */

const mqtt = require("mqtt");

const BROKER = process.env.MQTT_BROKER || "mqtt://localhost:1883";
const SITE_ID = "site01";
const ASSET_ID = "pmu01";
const BASE_TOPIC = `lansub/${SITE_ID}/${ASSET_ID}`;

const client = mqtt.connect(BROKER, {
    clientId: `pmu-simulator-${Date.now()}`,
    reconnectPeriod: 3000,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rand(base, range) {
    return parseFloat((base + (Math.random() - 0.5) * range * 2).toFixed(2));
}

function randInt(base, range) {
    return Math.round(base + (Math.random() - 0.5) * range * 2);
}

let uptimeSecs = 0;
let energyKwh = 12500 + Math.random() * 100;

// ─── Payload Builders ─────────────────────────────────────────────────────────

function buildTelemetry() {
    uptimeSecs++;
    const freq = rand(50.0, 0.05);
    const vA = rand(231.0, 2.0);
    const vB = rand(230.5, 2.0);
    const vC = rand(230.8, 2.0);
    const iA = rand(18.4, 1.5);
    const iB = rand(17.9, 1.5);
    const iC = rand(18.1, 1.5);
    const pTotal = parseFloat(((vA * iA + vB * iB + vC * iC) / 1000).toFixed(2));
    const qTotal = rand(5.2, 0.3);
    const sTotal = parseFloat(Math.sqrt(pTotal ** 2 + qTotal ** 2).toFixed(2));
    const pfTotal = parseFloat((pTotal / sTotal).toFixed(3));
    energyKwh += pTotal / 3600; // 1-second interval

    return {
        ts_ms: Date.now(),
        site_id: SITE_ID,
        asset_id: ASSET_ID,
        device_sn: "LANSUB-PMU-POC-0001",
        elec: {
            phases: 3,
            freq_hz: freq,
            v_ln_rms: { A: vA, B: vB, C: vC },
            i_rms: { A: iA, B: iB, C: iC },
            p_kw: { total: pTotal },
            q_kvar: { total: qTotal },
            s_kva: { total: sTotal },
            pf_total: pfTotal,
        },
        energy: {
            import_kwh_total: parseFloat(energyKwh.toFixed(2)),
        },
        pq: {
            thd_v_pct_est: rand(2.4, 0.5),
            thd_i_pct_est: rand(10.9, 1.5),
        },
        health: {
            rssi_dbm: randInt(-25, 10),
            uptime_s: uptimeSecs,
        },
    };
}

function buildStatus(state = "online") {
    if (state === "offline") return { state: "offline" };
    return {
        ts_ms: Date.now(),
        state: "online",
        rssi_dbm: randInt(-33, 5),
        ip: "10.0.0.50",
        uptime_s: uptimeSecs,
    };
}

function buildInfo() {
    return {
        site_id: SITE_ID,
        asset_id: ASSET_ID,
        device_sn: "LANSUB-PMU-POC-0001",
        device_type: "industrial_power_meter_poc",
        fw_version: "0.1.0",
        hw: "ESP32-POC",
        phases: 3,
        nominal_v_ln: 230,
        nominal_freq_hz: 50,
    };
}

function buildAlarm() {
    const alarms = [
        {
            severity: "warning",
            code: "OVERCURRENT",
            msg: "Phase current exceeded threshold",
            threshold_a: 45,
            phases_a: {
                A: rand(47, 3),
                B: rand(41, 2),
                C: rand(44, 2),
            },
        },
        {
            severity: "warning",
            code: "UNDERVOLTAGE",
            msg: "Phase voltage below nominal",
            threshold_a: 210,
            phases_a: { A: rand(208, 2), B: rand(230, 2), C: rand(229, 2) },
        },
        {
            severity: "critical",
            code: "HIGH_THD",
            msg: "Total harmonic distortion too high",
            threshold_a: 15,
            phases_a: { A: rand(17, 2), B: rand(15, 1), C: rand(16, 1) },
        },
    ];
    const alarm = alarms[Math.floor(Math.random() * alarms.length)];
    return { ts_ms: Date.now(), ...alarm };
}

// ─── Main Publish Loop ────────────────────────────────────────────────────────

client.on("connect", () => {
    console.log(`✅ Simulator connected to: ${BROKER}`);
    console.log(`📡 Publishing to: ${BASE_TOPIC}/*`);
    console.log("   Press Ctrl+C to stop\n");

    // 1. Publish device info once at startup
    client.publish(`${BASE_TOPIC}/info`, JSON.stringify(buildInfo()), {
        retain: true,
    });
    console.log("ℹ️  Published device info");

    // 2. Publish online status (retained)
    client.publish(`${BASE_TOPIC}/status`, JSON.stringify(buildStatus("online")), {
        retain: true,
    });
    console.log("💡 Published status: online");

    // 3. Publish telemetry every second
    setInterval(() => {
        const payload = buildTelemetry();
        client.publish(`${BASE_TOPIC}/telemetry`, JSON.stringify(payload));
        process.stdout.write(
            `\r📊 P=${payload.elec.p_kw.total}kW  V=${payload.elec.v_ln_rms.A}V  PF=${payload.elec.pf_total}  E=${payload.energy.import_kwh_total}kWh`
        );
    }, 1000);

    // 4. Fire random alarms every 30 seconds
    setInterval(() => {
        if (Math.random() < 0.4) {
            // 40% chance each interval
            const alarm = buildAlarm();
            client.publish(`${BASE_TOPIC}/alarms`, JSON.stringify(alarm));
            console.log(`\n🚨 Alarm fired: ${alarm.code} (${alarm.severity})`);
        }
    }, 30000);

    // 5. Update status every 10 seconds
    setInterval(() => {
        client.publish(
            `${BASE_TOPIC}/status`,
            JSON.stringify(buildStatus("online")),
            { retain: true }
        );
    }, 10000);
});

client.on("error", (err) => {
    console.error("❌ MQTT error:", err.message);
});

client.on("reconnect", () => {
    console.log("🔄 Reconnecting...");
});

// Graceful shutdown
process.on("SIGINT", () => {
    console.log("\n\n🛑 Shutting down simulator...");
    // Force exit after 2 seconds if broker is unreachable
    const forceExit = setTimeout(() => {
        console.log("⚡ Force exit (broker unreachable)");
        process.exit(0);
    }, 2000);
    forceExit.unref();
    try {
        client.publish(
            `${BASE_TOPIC}/status`,
            JSON.stringify({ state: "offline" }),
            { retain: true },
            () => {
                client.end();
                process.exit(0);
            }
        );
    } catch {
        process.exit(0);
    }
});
