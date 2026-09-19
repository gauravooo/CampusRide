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

### 4. Access URLs
- **Mobile PWA App**: `http://localhost:8000/`
- **Desktop Admin Portal**: `http://localhost:8000/admin`
- **API Health Check**: `http://localhost:8000/api/health`

---

## 📱 Mobile Access via Public HTTPS Tunnel (Zero Splash Screen)
Run Cloudflare Tunnel to access on any phone without exposing your local PC IP:
```bash
.\cloudflare.exe tunnel --url http://127.0.0.1:8000
```
Open the generated `https://<subdomain>.trycloudflare.com` URL in **Safari (iOS)** or **Chrome (Android)** and select **"Add to Home Screen"** to install as a native PWA app icon.
