import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function CampusMap({ hubs, cycles, height = "h-full", onSelectCycle, userLocation, onSelectHub }) {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const layerGroup = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!leafletMap.current) {
      // Initialize Leaflet map centered at IIM Bodh Gaya
      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([24.6961, 84.9869], 16.5);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(map);

      L.control.zoom({ position: 'topright' }).addTo(map);

      leafletMap.current = map;
      layerGroup.current = L.layerGroup().addTo(map);
    }

    const map = leafletMap.current;
    const layers = layerGroup.current;
    layers.clearLayers();

    // 1. Render Hub Geofence Circles & Station Badges
    hubs.forEach((h) => {
      const availCount = cycles.filter((c) => c.hubId === h.id && c.status === 'available').length;
      const color = availCount > 3 ? '#10b981' : availCount > 0 ? '#3b82f6' : '#ef4444';

      // Geofence Circle
      const circle = L.circle([h.lat, h.lng], {
        radius: h.radius_meters || 60,
        color: color,
        fillColor: color,
        fillOpacity: 0.12,
        weight: 1.5,
        dashArray: '4, 6'
      });
      layers.addLayer(circle);

      // Station Marker Pill
      const hubHtml = `
        <div class="px-3 py-1.5 bg-slate-950/90 text-white rounded-full border border-white/20 shadow-2xl flex items-center gap-2 font-sans whitespace-nowrap cursor-pointer hover:scale-105 transition">
          <div class="w-2.5 h-2.5 rounded-full" style="background-color: ${color}"></div>
          <span class="text-xs font-black tracking-tight">${h.name}</span>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono">${availCount} 🚲</span>
        </div>
      `;

      const hubIcon = L.divIcon({
        html: hubHtml,
        className: 'custom-hub-marker',
        iconSize: [140, 32],
        iconAnchor: [70, 16]
      });

      const hubMarker = L.marker([h.lat, h.lng], { icon: hubIcon });
      hubMarker.on('click', () => {
        if (onSelectHub) onSelectHub(h);
      });

      hubMarker.bindPopup(`
        <div style="padding:6px; min-width:170px; color:#ffffff; font-family:sans-serif;">
          <h4 style="margin:0; font-size:14px; font-weight:800; color:#60a5fa;">${h.name} (${h.code})</h4>
          <p style="margin:4px 0; font-size:11px; color:#94a3b8;">${h.description}</p>
          <div style="margin-top:6px; font-size:12px; font-weight:700; color:#10b981;">
            🚲 ${availCount} / ${h.capacity} Cycles Free
          </div>
        </div>
      `);
      layers.addLayer(hubMarker);
    });

    // 2. Render Available Cycles Pins
    const availableCycles = cycles.filter((c) => c.status === 'available').slice(0, 35);
    availableCycles.forEach((c) => {
      const cycleHtml = `
        <div class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-xl border-2 border-white hover:scale-110 transition cursor-pointer text-sm">
          🚲
        </div>
      `;

      const cycleIcon = L.divIcon({
        html: cycleHtml,
        className: 'custom-cycle-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const cycleMarker = L.marker([c.lat, c.lng], { icon: cycleIcon });
      cycleMarker.on('click', () => {
        if (onSelectCycle) onSelectCycle(c);
      });

      cycleMarker.bindPopup(`
        <div style="padding:6px; text-align:center; font-family:sans-serif;">
          <strong style="color:#ffffff; font-size:14px; display:block;">${c.code}</strong>
          <span style="font-size:11px; color:#10b981; font-weight:bold;">⚡ ${c.batteryPct}% Battery • BLE Lock</span><br/>
          <span style="font-size:10px; color:#94a3b8; font-family:monospace;">PIN: ${c.lockPin}</span>
        </div>
      `);
      layers.addLayer(cycleMarker);
    });

    // 3. User Location Marker
    if (userLocation) {
      const userHtml = `
        <div class="w-4 h-4 rounded-full bg-emerald-400 border-2 border-white shadow-[0_0_15px_#10b981] animate-ping"></div>
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

  return (
    <div className={`relative w-full ${height} overflow-hidden`}>
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
