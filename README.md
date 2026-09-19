# IIM Bodh Gaya - CampusRide React PWA 🚲

A 100% zero-cost, serverless **React Progressive Web Application (PWA)** tailored for **IIM Bodh Gaya** (~24.6961° N, 84.9869° E) campus cycle sharing. Built with **React 18, Vite, Tailwind CSS, Leaflet.js, and Lucide React**, designed specifically for direct zero-cost deployment on **Cloudflare Pages**.

---

## 🌟 Key Features

- **Cloudflare Pages Ready**: Pure client-side React architecture requiring **zero Python backend** or tunnel server. Deploy for 100% FREE on Cloudflare Pages (`*.pages.dev`).
- **200 Fleet Cycles**: 10 IIM Bodh Gaya campus hubs (`Main Gate`, `Academic Block`, `Mess/Annapurna`, `Sports Complex`, `H1&H2 Hostel`, `H3&H4 Hostel`, `Hostel Block`, `Siang+Bose`, `Gargi Hostel`, `Aryabhatta Hostel`).
- **Haversine Geofencing**: Real-time geospatial distance checks enforcing hub drop-offs within 60m radius.
- **Dual Lock Mechanism**: 
  - **Option A**: 4-digit PIN reveal for manual combination locks.
  - **Option B**: Virtual BLE Smart Lock trigger with real-time battery & RSSI signal telemetry.
- **AI Integration**:
  - **YOLO/ONNX Parking Photo Verification**: Validates parking photos upon trip end.
  - **RandomForest Fleet Demand Forecaster**: Predicts hub cycle deficits based on class hours, dining schedules, and hostel movement.
- **Google SSO & Domain Validation**: Enforces `@iimbg.ac.in` domain access with instant student and admin dev bypass buttons.
- **Desktop Admin Portal**: Live Leaflet.js fleet map, real-time trip statistics, rebalancing alerts, and student trust score leaderboards.

---

## 💻 Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Run React Dev Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Build Production Bundle
```bash
npm run build
```
Generates production assets in the `dist/` folder.

---

## ⚡ How to Deploy to Cloudflare Pages (100% FREE & Permanent)

### Option A: Direct GitHub Integration (Automatic - Recommended)
1. Go to **[Cloudflare Dashboard](https://dash.cloudflare.com/)** -> **Workers & Pages** -> **Create Application** -> **Pages**.
2. Connect your GitHub account and select repository **`gauravooo/CampusRide`**.
3. Set build configuration:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Click **Save and Deploy**. Cloudflare will host your PWA permanently on a free `https://campusride.pages.dev` URL!

---

### Option B: Command Line Deployment via Wrangler
```bash
npx wrangler pages deploy dist --project-name=campusride
```
