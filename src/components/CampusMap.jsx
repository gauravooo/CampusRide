import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Navigation, Maximize2, Minimize2, Layers, Tag, Compass } from 'lucide-react';

// Official OpenStreetMap IIM Bodh Gaya Campus Boundary (osm_id: 1530871991)
const IIMBG_CAMPUS_POLYGON = [
  [24.6865, 84.9628],
  [24.6865, 84.9698],
  [24.6773, 84.9698],
  [24.6773, 84.9628]
];

// Helper to compute bounds dynamically from admin-configured hubs
const getDynamicBounds = (hubsList) => {
  if (!hubsList || hubsList.length === 0) {
    return L.latLngBounds([24.6760, 84.9610], [24.6880, 84.9720]);
  }
  const lats = hubsList.map((h) => parseFloat(h.lat)).filter((v) => !isNaN(v) && v !== 0);
  const lngs = hubsList.map((h) => parseFloat(h.lng)).filter((v) => !isNaN(v) && v !== 0);
  if (lats.length === 0 || lngs.length === 0) {
    return L.latLngBounds([24.6760, 84.9610], [24.6880, 84.9720]);
  }
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  // Add 30% breathing padding around outer hubs
  const latPad = Math.max((maxLat - minLat) * 0.35, 0.0025);
  const lngPad = Math.max((maxLng - minLng) * 0.35, 0.0030);

  return L.latLngBounds(
    [minLat - latPad, minLng - lngPad],
    [maxLat + latPad, maxLng + lngPad]
  );
};

// Helper to compute geographic center of all hubs
const getDynamicCenter = (hubsList) => {
  if (!hubsList || hubsList.length === 0) return [24.6818, 84.9663];
  const lats = hubsList.map((h) => parseFloat(h.lat)).filter((v) => !isNaN(v) && v !== 0);
  const lngs = hubsList.map((h) => parseFloat(h.lng)).filter((v) => !isNaN(v) && v !== 0);
  if (lats.length === 0 || lngs.length === 0) return [24.6818, 84.9663];
  return [
    (Math.min(...lats) + Math.max(...lats)) / 2,
    (Math.min(...lngs) + Math.max(...lngs)) / 2
  ];
};

const getHubIcon = (code = '', name = '') => {
  const text = (code + ' ' + name).toLowerCase();
  if (text.includes('mg') || text.includes('gate') || text.includes('entrance')) return '🚪';
  if (text.includes('ab') || text.includes('academic') || text.includes('lecture') || text.includes('library')) return '🏛️';
  if (text.includes('ms') || text.includes('mess') || text.includes('annapurna') || text.includes('dining')) return '🍽️';
  if (text.includes('sc') || text.includes('sport') || text.includes('udaan') || text.includes('gym')) return '🏸';
  if (text.includes('h9') || text.includes('hstl') || text.includes('executive')) return '🏨';
  if (text.includes('hostel') || text.includes('tilak') || text.includes('attri') || text.includes('azad') || text.includes('patel') || text.includes('siang') || text.includes('gargi') || text.includes('aryabhatta')) return '🏠';
  return '📍';
};

export default function CampusMap({ hubs = [], cycles = [], height = "h-56", onSelectCycle, userLocation, currentUser }) {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const layerGroup = useRef(null);
  const tileLayersRef = useRef([]);
  const onSelectCycleRef = useRef(onSelectCycle);

  useEffect(() => {
    onSelectCycleRef.current = onSelectCycle;
  }, [onSelectCycle]);

  // Map settings with persistent localStorage
  const [mapStyle, setMapStyle] = useState(() => {
    return localStorage.getItem('campus_map_style') || 'streets';
  });
  const [showLabels, setShowLabels] = useState(() => {
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
      // 1. OpenStreetMap Standard - Full Road Names, Gaya-Dobhi-Road & Campus Labels
      const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
      tileLayersRef.current.push(osm);
    } else if (style === 'satellite') {
      // 2. Esri World Imagery (High-Resolution Satellite Aerial)
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

  // 1. Initialize Leaflet Map Instance
  useEffect(() => {
    if (!mapRef.current) return;

    if (!leafletMap.current) {
      const initialCenter = getDynamicCenter(hubs);
      const initialBounds = getDynamicBounds(hubs);

      const map = L.map(mapRef.current, {
        center: initialCenter,
        zoom: 16.5,
        minZoom: 15.0,
        maxZoom: 19,
        maxBounds: initialBounds,
        maxBoundsViscosity: 0.8,
        zoomControl: false,
        attributionControl: false
      });

      L.control.zoom({ position: 'topleft' }).addTo(map);

      leafletMap.current = map;
      layerGroup.current = L.layerGroup().addTo(map);
      updateTileLayers(mapStyle);

      // Fit view nicely to current hubs
      map.fitBounds(initialBounds, { padding: [25, 25], maxZoom: 17 });
    }

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  // 2. Adjust bounds dynamically whenever admin updates hubs
  useEffect(() => {
    if (!leafletMap.current || hubs.length === 0) return;
    const dynamicBounds = getDynamicBounds(hubs);
    leafletMap.current.setMaxBounds(dynamicBounds);
  }, [hubs]);

  // 3. Handle Map Style Switch
  useEffect(() => {
    updateTileLayers(mapStyle);
    localStorage.setItem('campus_map_style', mapStyle);
  }, [mapStyle]);

  // 4. Invalidate Size on Expand
  useEffect(() => {
    const timer = setTimeout(() => {
      if (leafletMap.current) {
        leafletMap.current.invalidateSize();
        const bounds = getDynamicBounds(hubs);
        leafletMap.current.fitBounds(bounds, { padding: [25, 25], maxZoom: 17 });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [isExpanded]);

  // 5. Render Layers (Campus Boundary, Designated Hubs, Available Cycles, User Location)
  useEffect(() => {
    if (!leafletMap.current || !layerGroup.current) return;

    const layers = layerGroup.current;
    layers.clearLayers();

    // A. IIMBG Campus Boundary Outline
    const campusBorder = L.polygon(IIMBG_CAMPUS_POLYGON, {
      color: '#3b82f6',
      weight: 2,
      dashArray: '6, 8',
      fillColor: '#3b82f6',
      fillOpacity: 0.03
    });
    layers.addLayer(campusBorder);

    // B. Designated Hubs (With Dynamic Admin Coordinates)
    hubs.forEach((h) => {
      if (!h.lat || !h.lng) return;

      const availCount = cycles.filter((c) => c.hubId === h.id && c.status === 'available').length;
      const color = availCount > 3 ? '#10b981' : availCount > 0 ? '#3b82f6' : '#ef4444';
      const icon = getHubIcon(h.code, h.name);

      // Geofence Circle with true radius
      const circle = L.circle([h.lat, h.lng], {
        radius: h.radius_meters || 25,
        color: color,
        fillColor: color,
        fillOpacity: 0.15,
        weight: 1.5,
        dashArray: '4, 6'
      });
      layers.addLayer(circle);

      // Station Marker Pill (High Z-Index 1500: Always visible and floating on top)
      const hubHtml = showLabels
        ? `
          <div class="group px-2.5 py-1 bg-slate-950/95 text-white rounded-full border-2 shadow-2xl flex items-center gap-1.5 font-sans whitespace-nowrap cursor-pointer hover:scale-105 transition-all text-xs font-black backdrop-blur-md" style="border-color: ${color};">
            <span class="text-xs">${icon}</span>
            <span class="tracking-tight text-white font-extrabold">${h.name}</span>
            <span class="text-[10px] font-mono px-1.5 py-0.5 rounded-full font-black shadow-inner" style="background-color: ${color}25; color: ${color};">
              ${availCount} 🚲
            </span>
          </div>
        `
        : `
          <div class="w-6 h-6 rounded-full bg-slate-950/95 text-white border-2 flex items-center justify-center font-bold shadow-xl text-xs hover:scale-110 transition cursor-pointer" style="border-color: ${color};">
            <span>${icon}</span>
          </div>
        `;

      const hubIcon = L.divIcon({
        html: hubHtml,
        className: 'custom-hub-marker',
        iconSize: showLabels ? [145, 30] : [24, 24],
        iconAnchor: showLabels ? [72, 15] : [12, 12]
      });

      const hubMarker = L.marker([h.lat, h.lng], { icon: hubIcon, zIndexOffset: 1500 });
      hubMarker.bindPopup(`
        <div style="padding:6px; min-width:175px; color:#ffffff; font-family:sans-serif;">
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
            <span style="font-size:16px;">${icon}</span>
            <h4 style="margin:0; font-size:14px; font-weight:800; color:#60a5fa;">${h.name}</h4>
          </div>
          <p style="margin:2px 0 6px 0; font-size:11px; color:#94a3b8;">${h.description || 'Designated campus pickup & drop hub.'}</p>
          <div style="display:flex; justify-content:space-between; align-items:center; padding-top:4px; border-top:1px solid rgba(255,255,255,0.1); font-size:12px;">
            <span style="color:${color}; font-weight:700;">🚲 ${availCount} / ${h.capacity || 25} Available</span>
            <span style="color:#94a3b8; font-size:10px; font-family:monospace;">${h.code}</span>
          </div>
        </div>
      `);
      layers.addLayer(hubMarker);
    });

    // C. Available Cycles (Evenly distributed micro-pins across ALL designated campus hubs)
    if (showCycles) {
      const hubCycleCounts = new Map();
      const availableCycles = [];

      cycles.forEach((c) => {
        if (c.status !== 'available') return;
        const currentCount = hubCycleCounts.get(c.hubId) || 0;
        if (currentCount < 8) {
          hubCycleCounts.set(c.hubId, currentCount + 1);
          const hub = hubs.find((h) => String(h.id) === String(c.hubId));
          // If lat/lng missing or out of place, position within hub radius
          let lat = parseFloat(c.lat);
          let lng = parseFloat(c.lng);
          if (!lat || !lng || (hub && (Math.abs(lat - hub.lat) > 0.003 || Math.abs(lng - hub.lng) > 0.003))) {
            if (hub) {
              lat = hub.lat + (Math.random() - 0.5) * 0.0003;
              lng = hub.lng + (Math.random() - 0.5) * 0.0003;
            }
          }
          if (lat && lng) {
            availableCycles.push({ ...c, lat, lng });
          }
        }
      });

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
        cycleMarker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          if (onSelectCycleRef.current) {
            onSelectCycleRef.current(c.qrCode);
          }
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

      // Live In-Use Cycles (Active Rides with glowing pulse)
      const inUseCycles = cycles.filter((c) => c.status === 'in_use');
      inUseCycles.forEach((c) => {
        if (!c.lat || !c.lng) return;

        const inUseHtml = `
          <div class="relative flex items-center justify-center">
            <div class="w-6 h-6 rounded-full bg-amber-400/50 border border-amber-300 animate-ping absolute"></div>
            <div class="w-5 h-5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold shadow-lg border border-white relative z-10 text-[10px]">
              🚴
            </div>
          </div>
        `;

        const inUseIcon = L.divIcon({
          html: inUseHtml,
          className: 'custom-cycle-inuse-marker',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        const inUseMarker = L.marker([c.lat, c.lng], { icon: inUseIcon, zIndexOffset: 900 });
        inUseMarker.bindPopup(`
          <div style="padding:4px; text-align:center; font-family:sans-serif;">
            <div style="display:inline-block; padding:2px 6px; background:#f59e0b; color:#000; font-size:9px; font-weight:900; border-radius:4px; margin-bottom:3px;">⚡ ACTIVE RIDE IN PROGRESS</div>
            <strong style="color:#ffffff; font-size:13px; display:block;">${c.code}</strong>
            <span style="font-size:11px; color:#10b981; font-weight:bold;">⚡ ${c.batteryPct}% Battery</span><br/>
            <span style="font-size:10px; color:#cbd5e1;">Rider active on campus</span>
          </div>
        `);
        layers.addLayer(inUseMarker);
      });
    }

    // D. User Location Marker
    if (userLocation && userLocation.lat && userLocation.lng) {
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
  }, [hubs, cycles, userLocation, showLabels, showCycles, currentUser]);

  const handleRecenterCampus = () => {
    if (leafletMap.current) {
      const dynamicCenter = getDynamicCenter(hubs);
      const dynamicBounds = getDynamicBounds(hubs);
      leafletMap.current.fitBounds(dynamicBounds, { padding: [25, 25], maxZoom: 17 });
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

        {/* Action Buttons: Labels Toggle, Cycles Toggle, Recenter, Fullscreen */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-md rounded-xl p-1 border border-white/15 shadow-xl">
          <button
            onClick={() => {
              const val = !showLabels;
              setShowLabels(val);
              localStorage.setItem('campus_map_landmarks', String(val));
            }}
            className={`px-2 py-1 text-[10px] font-bold rounded-lg transition flex items-center gap-1 ${
              showLabels ? 'bg-slate-800 text-sky-300' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Toggle Hub Name Labels"
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
