<div align="center">

# ⚡ Industrial Power Meter Dashboard

**Real-time IoT monitoring for industrial electrical power meters**

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![MQTT](https://img.shields.io/badge/MQTT-Mosquitto-660066?style=for-the-badge&logo=eclipsemosquitto&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-latest-000000?style=for-the-badge)

*Built by **Arish** · LANSUB Technologies*

</div>

---

## 📖 Overview

The **Industrial Power Meter Dashboard** is a full-stack IoT monitoring system that collects, stores, and visualises real-time electrical measurements from ESP32-based power meters over MQTT.

**Pipeline:**
```
ESP32 Device  →  MQTT Broker (Azure VM)  →  Node.js Backend  →  MongoDB Atlas  →  Next.js Dashboard
```

> 🔴 **Live data** streams every second via Socket.IO — voltage, current, power, power factor, THD, alarms, and more.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📊 **Real-time Dashboard** | Live electrical metrics updated every second |
| 🔌 **3-Phase Monitoring** | Voltage, current & power for Phases A, B & C |
| 📈 **Trend Charts** | 60-second rolling history with Recharts |
| 🚨 **Alarm Panel** | Severity-based alerts (critical / warning / info) |
| 🤖 **AI Assistant** | Power analytics chatbot for diagnostics |
| ⚙️ **Config Page** | Edit MQTT broker & device settings, saved to MongoDB |
| 🔧 **Settings Page** | App preferences (theme, timezone, data retention) |
| 🌙 **Dark / Light Toggle** | Instant theme switching |
| 📱 **Mobile Responsive** | Full sidebar drawer + responsive grids on all screen sizes |
| 🗄️ **Persistent Config** | All settings stored in MongoDB Atlas |

---

## 🏗️ Architecture

```
                    ┌─────────────────────────────────┐
                    │         Azure VM                │
                    │   Mosquitto MQTT Broker :1883    │
                    └──────────────┬──────────────────┘
                                   │  MQTT Subscribe (lansub/#)
                    ┌──────────────▼──────────────────┐
                    │    Node.js Backend (Windows)    │
                    │  Express REST API      :3001     │
                    │  Socket.IO WebSocket   :3001     │
                    └──────────┬──────────────────────┘
                               │
              ┌────────────────▼──┐  ┌────────────────────────┐
              │  MongoDB Atlas    │  │  Next.js Frontend      │
              │  · telemetry      │  │  shadcn/ui + Recharts  │
              │  · status         │  │  Socket.IO client      │
              │  · alarms         │  │  http://localhost:3000  │
              │  · info           │  └────────────────────────┘
              │  · config         │
              │  · app_settings   │
              └───────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Device | ESP32 | Power meter hardware |
| Protocol | MQTT | IoT messaging |
| Broker | Mosquitto | MQTT message broker on Azure |
| Cloud | Azure VM | Hosts the MQTT broker |
| Backend | Node.js + Express | REST API server |
| Real-time | Socket.IO | Live data push to frontend |
| Database | MongoDB Atlas | Time-series data & config storage |
| Frontend | Next.js 15 (App Router) | React framework |
| UI Library | shadcn/ui | Component library |
| Charts | Recharts | Live trend visualisation |
| Simulator | Node.js | Fake ESP32 for testing |

---

## 📁 Project Structure

```
Industrial Power Meter Dashboard/
├── backend/                        # Node.js API server
│   ├── server.js                   # Main entry — MQTT + Socket.IO + Express
│   ├── .env                        # Environment variables (not committed)
│   ├── models/
│   │   ├── Telemetry.js            # Electrical measurement schema
│   │   ├── Status.js               # Device online/offline schema
│   │   ├── Alarm.js                # Alarm event schema
│   │   ├── Info.js                 # Device metadata schema
│   │   ├── Config.js               # Broker/device config schema
│   │   └── AppSettings.js          # User preferences schema
│   └── routes/
│       └── api.js                  # All REST endpoints
│
├── simulator/                      # Fake ESP32 for testing
│   └── simulate.js                 # Publishes realistic MQTT data
│
├── frontend/                       # Next.js 15 dashboard
│   ├── app/
│   │   ├── layout.js               # Root layout with sidebar
│   │   ├── page.js                 # Redirect → /dashboard
│   │   ├── dashboard/page.js       # Live power meter view
│   │   ├── ai/page.js              # AI assistant chat
│   │   ├── config/page.js          # Device & broker config form
│   │   └── settings/page.js        # App preferences
│   ├── components/
│   │   ├── layout/AppSidebar.jsx   # Collapsible sidebar with user menu
│   │   └── ui/                     # shadcn/ui auto-generated components
│   └── lib/
│       ├── socket.js               # Socket.IO singleton
│       └── api.js                  # Fetch helpers for REST API
│
├── DASHBOARD_DOCS.md               # Full technical documentation
└── README.md                       # This file
```

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account (free tier works)
- MQTT broker — Mosquitto on an Azure VM (or use a public broker for testing)

---

### Step 1 — Clone the repository

```bash
git clone https://github.com/your-username/industrial-power-meter-dashboard.git
cd "industrial-power-meter-dashboard"
```

---

### Step 2 — Configure the backend

```bash
cd backend
cp .env.example .env   # or create .env manually
```

Edit `backend/.env`:

```env
MQTT_BROKER_URL=mqtt://YOUR_VM_IP:1883
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/pmu
PORT=3001
```

Install dependencies and start:

```bash
npm install
node server.js
```

✅ Expected output:
```
🚀 Server running on http://localhost:3001
✅ Connected to MQTT broker: mqtt://...
✅ MongoDB connected
```

---

### Step 3 — Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)**

---

### Step 4 — (Optional) Run the simulator

Use this when no physical ESP32 is available:

```bash
cd simulator
npm install
node simulate.js
```

To target a specific broker:

```bash
# Windows PowerShell
$env:MQTT_BROKER="mqtt://YOUR_VM_IP:1883"; node simulate.js

# Linux / macOS
MQTT_BROKER=mqtt://YOUR_VM_IP:1883 node simulate.js
```

Stop with **Ctrl+C** (exits automatically within 2 seconds).

---

## 📡 MQTT Topics & Payload Reference

All topics follow the pattern: `lansub/<site_id>/<asset_id>/<type>`

### Telemetry — `lansub/site01/pmu01/telemetry`
Published every second by the device.

```json
{
  "ts_ms": 1709567890123,
  "site_id": "site01",
  "asset_id": "pmu01",
  "device_sn": "LANSUB-PMU-POC-0001",
  "elec": {
    "phases": 3,
    "freq_hz": 50.02,
    "v_ln_rms": { "A": 231.2, "B": 230.6, "C": 230.9 },
    "i_rms":   { "A": 18.4,  "B": 17.9,  "C": 18.1  },
    "p_kw":    { "total": 11.86 },
    "q_kvar":  { "total": 5.21  },
    "s_kva":   { "total": 12.96 },
    "pf_total": 0.915
  },
  "energy":  { "import_kwh_total": 12543.88 },
  "pq":      { "thd_v_pct_est": 2.4, "thd_i_pct_est": 10.9 },
  "health":  { "rssi_dbm": -20, "uptime_s": 999 }
}
```

### Status — `lansub/site01/pmu01/status` *(retained)*
```json
{ "state": "online", "rssi_dbm": -33, "ip": "10.0.0.50", "uptime_s": 123 }
```

### Info — `lansub/site01/pmu01/info` *(retained, published once)*
```json
{
  "site_id": "site01", "asset_id": "pmu01",
  "device_sn": "LANSUB-PMU-POC-0001",
  "fw_version": "0.1.0", "hw": "ESP32-POC",
  "phases": 3, "nominal_v_ln": 230, "nominal_freq_hz": 50
}
```

### Alarms — `lansub/site01/pmu01/alarms`
```json
{
  "ts_ms": 123456, "severity": "warning",
  "code": "OVERCURRENT",
  "msg": "Phase current exceeded threshold",
  "threshold_a": 45
}
```

---

## 🔌 REST API Reference

Base URL: `http://localhost:3001`

| Method | Endpoint | Query | Description |
|--------|----------|-------|-------------|
| `GET` | `/api/telemetry` | `?limit=60` | Latest N telemetry readings |
| `GET` | `/api/status` | — | Current device online/offline state |
| `GET` | `/api/alarms` | `?limit=20` | Latest N alarm events |
| `GET` | `/api/info` | — | Device metadata |
| `PATCH` | `/api/alarms/:id/acknowledge` | — | Acknowledge an alarm |
| `GET` | `/api/config` | — | Load saved broker/device config |
| `POST` | `/api/config` | body: JSON | Save broker/device config to DB |
| `GET` | `/api/settings` | — | Load saved app settings |
| `POST` | `/api/settings` | body: JSON | Save app settings to DB |
| `GET` | `/health` | — | Server health check |

---

## 🖥️ Dashboard Pages

| Route | Page | Description |
|-------|------|-------------|
| `/dashboard` | **Dashboard** | Live metrics, phase table, trend charts, alarms, device info |
| `/ai` | **AI Assistant** | Power analytics chatbot with quick prompts |
| `/config` | **Configuration** | MQTT broker URL, site/asset ID, electrical parameters — saved to MongoDB |
| `/settings` | **Settings** | Dark mode, alarm sounds, data retention, timezone — saved to MongoDB |

### Sidebar
- Collapsible — icon-only or full width on desktop
- On mobile — slides in as a **drawer** (tap ☰ hamburger)
- **User profile** at the bottom → Sign Up / Log In / Log Out

---

## 🔧 Environment Variables

### `backend/.env`

| Variable | Example | Description |
|----------|---------|-------------|
| `MQTT_BROKER_URL` | `mqtt://98.70.44.76:1883` | MQTT broker address |
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.net/pmu` | MongoDB connection string |
| `PORT` | `3001` | Backend server port |

### `frontend/.env.local` *(optional)*

| Variable | Example | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_BACKEND_URL` | `http://localhost:3001` | Override backend URL |

---

## 🐛 Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| `connack timeout` | Mosquitto not running on VM | SSH → `sudo systemctl start mosquitto` |
| `ERR_CONNECTION_REFUSED` (frontend) | Backend not started | Run `node server.js` in `backend/` |
| `buffering timed out` | MongoDB not reachable | Whitelist your IP in MongoDB Atlas Network Access |
| Dashboard shows `--` everywhere | Backend offline | Start the backend first |
| Simulator won't quit | Old version — upgrade by pulling latest | Close the terminal window |
| Hydration warning in console | Browser extension (Grammarly etc.) | Already fixed with `suppressHydrationWarning` |

### Start Mosquitto on Azure VM (SSH)

```bash
ssh azureuser@YOUR_VM_IP
sudo systemctl start mosquitto   # start now
sudo systemctl enable mosquitto  # auto-start on reboot
sudo systemctl status mosquitto  # verify
```

### MongoDB Atlas — Allow All IPs (Development)

1. [cloud.mongodb.com](https://cloud.mongodb.com) → your cluster
2. **Security → Network Access → Add IP Address**
3. Click **"Allow Access from Anywhere"** → Confirm

---

## 📦 Scripts Reference

### Backend
```bash
npm install      # Install dependencies
node server.js   # Start server
```

### Frontend
```bash
npm install      # Install dependencies
npm run dev      # Development server → http://localhost:3000
npm run build    # Production build
npm start        # Start production server
```

### Simulator
```bash
npm install      # Install dependencies
node simulate.js # Start simulator (Ctrl+C to stop)
```

---

## 👤 Author

**Arish**  
IoT & Full-Stack Developer · LANSUB Technologies

- 🐙 GitHub: [@arish](https://github.com/Arish03)
- 📧 Email: arish@lansub.com
- 🏢 Project: Industrial Power Meter Dashboard (IPMD)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

---

<div align="center">

Made with ⚡ by **LANSUB Technologies**

</div>
