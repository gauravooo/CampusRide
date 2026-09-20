import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Navigation } from 'lucide-react';

// Official IIM Bodh Gaya Campus Geographic Boundary Coordinates
const IIMBG_CAMPUS_BOUNDS = L.latLngBounds(
  [24.6890, 84.9790], // South-West limit
  [24.7035, 84.9955]  // North-East limit
);

export default function CampusMap({ hubs, cycles, height = "h-56", onSelectCycle, userLocation }) {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const layerGroup = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!leafletMap.current) {
      // Initialize Leaflet map restricted strictly to IIM Bodh Gaya campus
      const map = L.map(mapRef.current, {
        center: [24.6961, 84.9869],
        zoom: 16.5,
        minZoom: 15.5, // Prevents zooming out of campus
        maxZoom: 19,
        maxBounds: IIMBG_CAMPUS_BOUNDS, // Limits map view to IIMBG
        maxBoundsViscosity: 1.0, // Strict wall: cannot drag/pan outside campus
        zoomControl: false,
        attributionControl: false
      });

      const cartoApiKey = import.meta.env.VITE_CARTO_API_KEY || 'cb1_3rjr_1_44d8c30ca60ac913e3f7a9ee';

      // 1. CARTO Dark Matter Base Layer
      L.tileLayer(`https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${cartoApiKey}`, {
        maxZoom: 19,
        subdomains: 'abcd',
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
      }).addTo(map);

      // 2. Medium High-Legibility Labels Layer (renders crisp road & landmark labels)
      L.tileLayer(`https://{s}.basemaps.cartocdn.com/rastertiles/dark_only_labels/{z}/{x}/{y}.png?key=${cartoApiKey}`, {
        maxZoom: 19,
        subdomains: 'abcd',
        zIndex: 10,
        opacity: 0.95
      }).addTo(map);

      L.control.zoom({ position: 'topleft' }).addTo(map);

      leafletMap.current = map;
      layerGroup.current = L.layerGroup().addTo(map);
    }

    const map = leafletMap.current;
    const layers = layerGroup.current;
    layers.clearLayers();

    // 1. Render Hub Geofence Circles & Medium Labels
    hubs.forEach((h) => {
      const availCount = cycles.filter((c) => c.hubId === h.id && c.status === 'available').length;
      const color = availCount > 3 ? '#10b981' : availCount > 0 ? '#3b82f6' : '#ef4444';

      // Geofence Circle
      const circle = L.circle([h.lat, h.lng], {
        radius: h.radius_meters || 60,
        color: color,
        fillColor: color,
        fillOpacity: 0.16,
        weight: 1.5,
        dashArray: '4, 6'
      });
      layers.addLayer(circle);

      // Medium Legible Station Marker Pill
      const hubHtml = `
        <div class="px-2.5 py-1 bg-slate-900/95 text-white rounded-full border border-blue-500/30 shadow-2xl flex items-center gap-1.5 font-sans whitespace-nowrap cursor-pointer hover:scale-105 transition">
          <div class="w-2.5 h-2.5 rounded-full" style="background-color: ${color}"></div>
          <span class="text-xs font-extrabold tracking-tight text-slate-100">${h.name}</span>
          <span class="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-blue-500/30 text-blue-300 font-mono">${availCount} 🚲</span>
        </div>
      `;

      const hubIcon = L.divIcon({
        html: hubHtml,
        className: 'custom-hub-marker',
        iconSize: [140, 32],
        iconAnchor: [70, 16]
      });

      const hubMarker = L.marker([h.lat, h.lng], { icon: hubIcon });
      hubMarker.bindPopup(`
        <div style="padding:6px; min-width:160px; color:#ffffff; font-family:sans-serif;">
          <h4 style="margin:0; font-size:14px; font-weight:800; color:#60a5fa;">${h.name} (${h.code})</h4>
          <p style="margin:4px 0; font-size:11px; color:#94a3b8;">${h.description}</p>
          <div style="margin-top:6px; font-size:12px; font-weight:700; color:#10b981;">
            🚲 ${availCount} / ${h.capacity} Available
          </div>
        </div>
      `);
      layers.addLayer(hubMarker);
    });

    // 2. Render Available Cycles Pins
    const availableCycles = cycles.filter((c) => c.status === 'available').slice(0, 30);
    availableCycles.forEach((c) => {
      const cycleHtml = `
        <div class="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-lg border-2 border-white hover:scale-110 transition cursor-pointer text-xs">
          🚲
        </div>
      `;

      const cycleIcon = L.divIcon({
        html: cycleHtml,
        className: 'custom-cycle-marker',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const cycleMarker = L.marker([c.lat, c.lng], { icon: cycleIcon });
      cycleMarker.on('click', () => {
        if (onSelectCycle) onSelectCycle(c.qrCode);
      });

      cycleMarker.bindPopup(`
        <div style="padding:4px; text-align:center; font-family:sans-serif;">
          <strong style="color:#ffffff; font-size:13px; display:block;">${c.code}</strong>
          <span style="font-size:11px; color:#10b981; font-weight:bold;">⚡ ${c.batteryPct}% Battery</span><br/>
          <span style="font-size:10px; color:#60a5fa; font-family:sans-serif;">Tap to scan & unlock</span>
        </div>
      `);
      layers.addLayer(cycleMarker);
    });

    // 3. User Location Marker
    if (userLocation) {
      const userHtml = `
        <div class="w-4 h-4 rounded-full bg-emerald-400 border-2 border-white shadow-[0_0_12px_#10b981] animate-ping"></div>
      `;
      const userIcon = L.divIcon({
        html: userHtml,
        className: 'custom-user-marker',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon });
      layers.addLayer(userMarker);
    }
  }, [hubs, cycles, userLocation]);

  const handleRecenterCampus = () => {
    if (leafletMap.current) {
      leafletMap.current.setView([24.6961, 84.9869], 16.5, { animate: true });
    }
  };

  return (
    <div className={`relative w-full ${height} rounded-2xl overflow-hidden border border-slate-800 z-0`}>
      <div ref={mapRef} className="w-full h-full" />
      {/* Quick Recenter Campus Button */}
      <button
        onClick={handleRecenterCampus}
        className="absolute top-2 right-2 z-[400] px-2.5 py-1 bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-[10px] font-bold rounded-xl border border-white/15 shadow-xl flex items-center gap-1 transition"
        title="Recenter IIMBG Campus"
      >
        <Navigation className="w-3 h-3 text-blue-400" />
        <span>Campus</span>
      </button>
    </div>
  );
}
