import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function CampusMap({ hubs, cycles, height = "h-56" }) {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!leafletMap.current) {
      leafletMap.current = L.map(mapRef.current).setView([24.6961, 84.9869], 16);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 19
      }).addTo(leafletMap.current);
    }

    const map = leafletMap.current;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });

    // Add Hub circle markers
    hubs.forEach((h) => {
      const availableCount = cycles.filter((c) => c.hubId === h.id && c.status === 'available').length;
      
      const marker = L.circleMarker([h.lat, h.lng], {
        radius: 10,
        fillColor: availableCount > 3 ? '#10b981' : availableCount > 0 ? '#f59e0b' : '#ef4444',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85
      }).addTo(map);

      marker.bindPopup(`
        <div style="text-align:center; padding:4px;">
          <strong style="color:#60a5fa; font-size:13px;">${h.name} (${h.code})</strong><br/>
          <span style="font-size:11px; color:#cbd5e1;">Capacity: ${h.capacity}</span><br/>
          <span style="font-size:12px; font-weight:bold; color:#10b981;">🚲 ${availableCount} Available</span>
        </div>
      `);
    });
  }, [hubs, cycles]);

  return (
    <div
      ref={mapRef}
      className={`w-full ${height} rounded-xl border border-slate-700/50 z-10`}
    />
  );
}
