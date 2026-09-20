import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Navigation, Maximize2, Minimize2, Layers, Tag, Compass } from 'lucide-react';

// Official IIM Bodh Gaya Campus Geographic Boundary Coordinates
const IIMBG_CAMPUS_BOUNDS = L.latLngBounds(
  [24.6890, 84.9790], // South-West limit
  [24.7035, 84.9955]  // North-East limit
);
const CAMPUS_CENTER = [24.6961, 84.9869];

// Campus Boundary Polygon (119-acre campus perimeter)
const IIMBG_CAMPUS_POLYGON = [
  [24.6998, 84.9845],
  [24.6998, 84.9925],
  [24.6925, 84.9925],
  [24.6925, 84.9845]
];

// High-Legibility Campus Facility Landmarks (fills in all missing building/road labels)
const CAMPUS_LANDMARKS = [
  { id: 'lm-lib', name: "Central Library (Gyanodaya)", icon: "📚", lat: 24.6969, lng: 84.9870, desc: "24/7 Digital Library & Reading Rooms" },
  { id: 'lm-adm', name: "Administrative Block", icon: "🏢", lat: 24.6974, lng: 84.9862, desc: "Director's Office & Academic Affairs" },
  { id: 'lm-hlth', name: "Campus Health Centre", icon: "🏥", lat: 24.6960, lng: 84.9855, desc: "24x7 First Aid & Medical Dispensary" },
  { id: 'lm-crkt', name: "Cricket & Athletics Ground", icon: "🏏", lat: 24.6936, lng: 84.9860, desc: "Floodlit Sports Ground & Running Track" },
  { id: 'lm-oat', name: "Open Air Amphitheatre", icon: "🎭", lat: 24.6950, lng: 84.9873, desc: "Cultural Center & Festival Venue" },
  { id: 'lm-fac', name: "Faculty & Staff Housing", icon: "🏡", lat: 24.6982, lng: 84.9910, desc: "Faculty Housing Enclave" },
  { id: 'lm-g2', name: "North Gate 2 (Service)", icon: "🛡️", lat: 24.6990, lng: 84.9880, desc: "Security Check & Service Entry" },
  { id: 'lm-rd', name: "Ashok Marg (Campus Spine)", icon: "🛣️", lat: 24.6980, lng: 84.9848, desc: "Main Campus Boulevard" }
];

const getHubIcon = (code = '') => {
  if (code.includes('MG')) return '🚪';
  if (code.includes('AB')) return '🏛️';
  if (code.includes('MS')) return '🍽️';
  if (code.includes('SC')) return '🏸';
  if (code.includes('HSTL')) return '🏨';
  if (code.includes('H1') || code.includes('H3') || code.includes('SB') || code.includes('GH') || code.includes('AH')) return '🏠';
  return '📍';
};

export default function CampusMap({ hubs = [], cycles = [], height = "h-56", onSelectCycle, userLocation }) {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const layerGroup = useRef(null);
  const tileLayersRef = useRef([]);

  // Map settings with persistent localStorage
  const [mapStyle, setMapStyle] = useState(() => {
    return localStorage.getItem('campus_map_style') || 'streets';
  });
  const [showLandmarks, setShowLandmarks] = useState(() => {
    const saved = localStorage.getItem('campus_map_landmarks');
    return saved !== null ? saved === 'true' : true;
  });
  const [showCycles, setShowCycles] = useState(() => {
    const saved = localStorage.getItem('campus_map_cycles');
    return saved !== null ? saved === 'true' : true;
  });
  const [isExpanded, setIsExpanded] = useState(false);

  // Helper to switch base tile layers
  const updateTileLayers = (style) => {
    if (!leafletMap.current) return;
    const map = leafletMap.current;

    // Remove current base layers
    tileLayersRef.current.forEach((l) => {
      try { map.removeLayer(l); } catch (e) {}
    });
    tileLayersRef.current = [];

    const cartoApiKey = import.meta.env.VITE_CARTO_API_KEY || 'cb1_3rjr_1_44d8c30ca60ac913e3f7a9ee';

    if (style === 'streets') {
      // 1. OpenStreetMap Standard - Full Road Names, Streets, Ashok Road & Local Labels
      const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
      tileLayersRef.current.push(osm);
    } else if (style === 'satellite') {
      // 2. Esri World Imagery (Real High-Res Aerial Satellite View)
      const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: '&copy; Esri, Maxar'
      }).addTo(map);
      // Reference Labels & Roads Overlay
      const labels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        zIndex: 10
      }).addTo(map);
      tileLayersRef.current.push(sat, labels);
    } else {
      // 3. CARTO Dark Matter
      const dark = L.tileLayer(`https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${cartoApiKey}`, {
        maxZoom: 19,
        subdomains: 'abcd',
        attribution: '&copy; CARTO'
      }).addTo(map);
      tileLayersRef.current.push(dark);
    }
  };

  // 1. Initialize Map Instance Once
  useEffect(() => {
    if (!mapRef.current) return;

    if (!leafletMap.current) {
      const map = L.map(mapRef.current, {
        center: CAMPUS_CENTER,
        zoom: 16.5,
        minZoom: 15.0,
        maxZoom: 19,
        maxBounds: IIMBG_CAMPUS_BOUNDS,
        maxBoundsViscosity: 0.9,
        zoomControl: false,
        attributionControl: false
      });

      L.control.zoom({ position: 'topleft' }).addTo(map);

      leafletMap.current = map;
      layerGroup.current = L.layerGroup().addTo(map);
      updateTileLayers(mapStyle);
    }

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  // 2. Handle Map Style Switch
  useEffect(() => {
    updateTileLayers(mapStyle);
    localStorage.setItem('campus_map_style', mapStyle);
  }, [mapStyle]);

  // 3. Invalidate Size on Expand
  useEffect(() => {
    const timer = setTimeout(() => {
      if (leafletMap.current) {
        leafletMap.current.invalidateSize();
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [isExpanded]);

  // 4. Render Layers (Hubs, Landmarks, Boundary, Cycles, User)
  useEffect(() => {
    if (!leafletMap.current || !layerGroup.current) return;

    const layers = layerGroup.current;
    layers.clearLayers();

    // A. Campus Boundary Outline
    const campusBorder = L.polygon(IIMBG_CAMPUS_POLYGON, {
      color: '#3b82f6',
      weight: 2,
      dashArray: '6, 8',
      fillColor: '#3b82f6',
      fillOpacity: 0.02
    });
    layers.addLayer(campusBorder);

    // B. Campus Facility Landmarks (If enabled)
    if (showLandmarks) {
      CAMPUS_LANDMARKS.forEach((lm) => {
        const lmHtml = `
          <div class="px-2 py-0.5 bg-slate-950/90 text-slate-100 rounded-lg border border-slate-700/80 shadow-xl flex items-center gap-1 font-sans whitespace-nowrap cursor-pointer text-[10px] font-bold backdrop-blur-md hover:scale-105 transition pointer-events-auto">
            <span>${lm.icon}</span>
            <span>${lm.name}</span>
          </div>
        `;
        const lmIcon = L.divIcon({
          html: lmHtml,
          className: 'custom-landmark-marker',
          iconSize: [120, 22],
          iconAnchor: [60, 11]
        });

        const marker = L.marker([lm.lat, lm.lng], { icon: lmIcon, zIndexOffset: 800 });
        marker.bindPopup(`
          <div style="padding:6px; min-width:160px; color:#ffffff; font-family:sans-serif;">
            <h4 style="margin:0; font-size:13px; font-weight:800; color:#38bdf8;">${lm.icon} ${lm.name}</h4>
            <p style="margin:4px 0 0 0; font-size:11px; color:#94a3b8;">${lm.desc}</p>
          </div>
        `);
        layers.addLayer(marker);
      });
    }

    // C. Render Designated Hub Stations (Prominent Floating Badges with Z-Index 1500)
    hubs.forEach((h) => {
      const availCount = cycles.filter((c) => c.hubId === h.id && c.status === 'available').length;
      const color = availCount > 3 ? '#10b981' : availCount > 0 ? '#3b82f6' : '#ef4444';
      const icon = getHubIcon(h.code);

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

      // Station Marker Pill (High-Contrast, Legible on any basemap)
      const hubHtml = `
        <div class="group px-2.5 py-1 bg-slate-950/95 text-white rounded-full border-2 shadow-2xl flex items-center gap-1.5 font-sans whitespace-nowrap cursor-pointer hover:scale-105 transition-all text-xs font-black backdrop-blur-md" style="border-color: ${color};">
          <span class="text-xs">${icon}</span>
          <span class="tracking-tight text-white font-extrabold">${h.name}</span>
          <span class="text-[10px] font-mono px-1.5 py-0.5 rounded-full font-black shadow-inner" style="background-color: ${color}25; color: ${color};">
            ${availCount} 🚲
          </span>
        </div>
      `;

      const hubIcon = L.divIcon({
        html: hubHtml,
        className: 'custom-hub-marker',
        iconSize: [145, 30],
        iconAnchor: [72, 15]
      });

      // High zIndexOffset ensures Hub labels NEVER get covered by cycle dots
      const hubMarker = L.marker([h.lat, h.lng], { icon: hubIcon, zIndexOffset: 1500 });
      hubMarker.bindPopup(`
        <div style="padding:6px; min-width:175px; color:#ffffff; font-family:sans-serif;">
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
            <span style="font-size:16px;">${icon}</span>
            <h4 style="margin:0; font-size:14px; font-weight:800; color:#60a5fa;">${h.name}</h4>
          </div>
          <p style="margin:2px 0 6px 0; font-size:11px; color:#94a3b8;">${h.description || 'Campus designated pickup & drop hub.'}</p>
          <div style="display:flex; justify-content:space-between; align-items:center; padding-top:4px; border-top:1px solid rgba(255,255,255,0.1); font-size:12px;">
            <span style="color:${color}; font-weight:700;">🚲 ${availCount} / ${h.capacity || 30} Available</span>
            <span style="color:#94a3b8; font-size:10px; font-family:monospace;">${h.code}</span>
          </div>
        </div>
      `);
      layers.addLayer(hubMarker);
    });

    // D. Available Cycles (Subtle micro-pins to avoid cluttering hubs)
    if (showCycles) {
      const availableCycles = cycles.filter((c) => c.status === 'available').slice(0, 35);
      availableCycles.forEach((c) => {
        const cycleHtml = `
          <div class="w-4 h-4 rounded-full bg-blue-600/90 text-white flex items-center justify-center font-bold shadow-md border border-white/90 hover:scale-125 transition cursor-pointer text-[9px]">
            🚲
          </div>
        `;

        const cycleIcon = L.divIcon({
          html: cycleHtml,
          className: 'custom-cycle-marker',
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });

        const cycleMarker = L.marker([c.lat, c.lng], { icon: cycleIcon, zIndexOffset: 500 });
        cycleMarker.on('click', () => {
          if (onSelectCycle) onSelectCycle(c.qrCode);
        });

        cycleMarker.bindPopup(`
          <div style="padding:4px; text-align:center; font-family:sans-serif;">
            <strong style="color:#ffffff; font-size:13px; display:block;">${c.code}</strong>
            <span style="font-size:11px; color:#10b981; font-weight:bold;">⚡ ${c.batteryPct}% Battery</span><br/>
            <span style="font-size:10px; color:#60a5fa; font-family:sans-serif;">Tap to unlock</span>
          </div>
        `);
        layers.addLayer(cycleMarker);
      });
    }

    // E. User Location Marker
    if (userLocation) {
      const userHtml = `
        <div class="relative flex items-center justify-center">
          <div class="w-4 h-4 rounded-full bg-emerald-400 border-2 border-white shadow-[0_0_12px_#10b981] animate-ping absolute"></div>
          <div class="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white relative z-10"></div>
        </div>
      `;
      const userIcon = L.divIcon({
        html: userHtml,
        className: 'custom-user-marker',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon, zIndexOffset: 2000 });
      userMarker.bindPopup(`
        <div style="padding:4px; font-family:sans-serif; text-align:center; color:#ffffff;">
          <strong style="color:#10b981; font-size:12px;">📍 Your Current Location</strong>
        </div>
      `);
      layers.addLayer(userMarker);
    }
  }, [hubs, cycles, userLocation, showLandmarks, showCycles]);

  const handleRecenterCampus = () => {
    if (leafletMap.current) {
      leafletMap.current.setView(CAMPUS_CENTER, 16.5, { animate: true });
    }
  };

  const containerClasses = isExpanded
    ? "fixed inset-3 md:inset-6 z-[9999] rounded-3xl shadow-2xl overflow-hidden border border-slate-700 bg-slate-950 flex flex-col"
    : `relative w-full ${height} rounded-2xl overflow-hidden border border-slate-800 z-0`;

  return (
    <div className={containerClasses}>
      {/* Map Interactive Toolbar */}
      <div className="absolute top-2.5 left-12 right-2.5 z-[400] flex items-center justify-between pointer-events-none gap-2">
        {/* Style Switcher: Streets (OSM) / Satellite (Esri) / Dark (CARTO) */}
        <div className="pointer-events-auto flex items-center bg-slate-950/90 backdrop-blur-md rounded-xl p-0.5 border border-white/15 shadow-xl text-[10px] font-bold">
          <button
            onClick={() => setMapStyle('streets')}
            className={`px-2 py-1 rounded-lg transition ${
              mapStyle === 'streets'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="OpenStreetMap with full street & road labels"
          >
            🗺️ Streets
          </button>
          <button
            onClick={() => setMapStyle('satellite')}
            className={`px-2 py-1 rounded-lg transition ${
              mapStyle === 'satellite'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="High-Resolution Satellite Imagery with Labels"
          >
            🛰️ Satellite
          </button>
          <button
            onClick={() => setMapStyle('dark')}
            className={`px-2 py-1 rounded-lg transition ${
              mapStyle === 'dark'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Minimalist Dark Mode"
          >
            🌙 Dark
          </button>
        </div>

        {/* Action Buttons: Landmarks Toggle, Cycles Toggle, Recenter, Fullscreen */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-md rounded-xl p-1 border border-white/15 shadow-xl">
          <button
            onClick={() => {
              const val = !showLandmarks;
              setShowLandmarks(val);
              localStorage.setItem('campus_map_landmarks', String(val));
            }}
            className={`px-2 py-1 text-[10px] font-bold rounded-lg transition flex items-center gap-1 ${
              showLandmarks ? 'bg-slate-800 text-sky-300' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Toggle Campus Facility Landmarks"
          >
            <Tag className="w-3 h-3" />
            <span className="hidden sm:inline">Labels</span>
          </button>

          <button
            onClick={() => {
              const val = !showCycles;
              setShowCycles(val);
              localStorage.setItem('campus_map_cycles', String(val));
            }}
            className={`px-2 py-1 text-[10px] font-bold rounded-lg transition flex items-center gap-1 ${
              showCycles ? 'bg-slate-800 text-emerald-400' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Toggle Individual Cycle Dots"
          >
            <span>🚲</span>
          </button>

          <button
            onClick={handleRecenterCampus}
            className="px-2 py-1 text-[10px] font-bold rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-1"
            title="Recenter to IIM Bodh Gaya Campus"
          >
            <Navigation className="w-3 h-3 text-blue-400" />
            <span className="hidden sm:inline">Campus</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title={isExpanded ? "Close Fullscreen" : "Expand Fullscreen Map"}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5 text-amber-400" /> : <Maximize2 className="w-3.5 h-3.5 text-slate-300" />}
          </button>
        </div>
      </div>

      {/* Map Canvas */}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
