# IIM Bodh Gaya - CampusRide PWA 🚲

A zero-cost, end-to-end Progressive Web Application (PWA) tailored for **IIM Bodh Gaya** (~24.6961° N, 84.9869° E) campus cycle sharing. Built with FastAPI, SQLite (Haversine geofencing), simulated IoT Smart Locks (Dual PIN + BLE mechanism), AI photo verification & RandomForest demand forecaster, and a Desktop Admin Portal.

---

## 🌟 Key Features

- **200 Fleet Cycles**: 10 IIM Bodh Gaya campus hubs (`Main Gate`, `Academic Block`, `Mess/Annapurna`, `Sports Complex`, `H1&H2 Hostel`, `H3&H4 Hostel`, `Hostel Block`, `Siang+Bose`, `Gargi Hostel`, `Aryabhatta Hostel`).
- **Haversine Geofencing**: SQLite geospatial distance checks enforcing hub drop-offs within 60m radius.
- **Dual Lock Mechanism**: 
  - **Option A**: 4-digit PIN reveal for manual combination locks.
  - **Option B**: Virtual BLE Smart Lock trigger with real-time battery & RSSI signal telemetry.
- **AI Integration**:
  - **YOLO/ONNX Parking Photo Verification**: Validates parking photos upon trip end.
  - **RandomForest Fleet Demand Forecaster**: Predicts hub cycle deficits based on class hours, dining schedules, and hostel movement.
- **Google SSO & Domain Validation**: Enforces `@iimbg.ac.in` domain access with an instant offline dev bypass toggle.
- **Desktop Admin Portal (`/admin`)**: Live Leaflet.js fleet map, real-time trip statistics, rebalancing alerts, and student trust score leaderboards.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Seed Database (200 Cycles across 10 Hubs)
```bash
python -m app.seed
```

### 3. Run FastAPI Backend Server
```bash
python -m uvicorn app.main:app --port 8000 --host 0.0.0.0
```

### 4. Local Access URLs
- **Mobile PWA App**: `http://localhost:8000/`
- **Desktop Admin Portal**: `http://localhost:8000/admin`
- **API Health Check**: `http://localhost:8000/api/health`

---

## 📱 How to Get Your Instant Zero-Splash HTTPS Link for Phone & Panel Presentation

Whenever you run your server locally on port `8000`, you can generate an instant, zero-splash public HTTPS URL using either method below:

### Option 1: Built-in Windows SSH (Zero Installation Needed)
Open terminal/PowerShell in the project folder and run:
```bash
ssh -R 80:127.0.0.1:8000 nokey@localhost.run
```
> **Output**: Prints an instant `https://<unique-id>.lhr.life` URL. Open this link on any phone browser. **Zero splash screen, zero warnings, 100% direct!**

### Option 2: Cloudflare Tunnel
Run Cloudflare Tunnel executable:
```bash
.\cloudflared.exe tunnel --url http://127.0.0.1:8000
```
> **Output**: Prints an instant `https://<unique-id>.trycloudflare.com` URL.
