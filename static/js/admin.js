// CampusRide Admin Portal JavaScript Logic

let adminMap = null;
let adminHubMarkers = [];

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();
  initAdminMap();
  loadAdminData();
  // Auto refresh every 30 seconds
  setInterval(loadAdminData, 30000);
});

function initAdminMap() {
  const mapElem = document.getElementById('admin-map');
  if (!mapElem) return;

  adminMap = L.map('admin-map').setView([24.6961, 84.9869], 16);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 19
  }).addTo(adminMap);
}

async function loadAdminData() {
  await Promise.all([
    fetchStats(),
    fetchAdminHubs(),
    fetchRebalanceForecast(),
    fetchStudents()
  ]);
  if (window.lucide) lucide.createIcons();
}

async function fetchStats() {
  try {
    const res = await fetch('/api/admin/stats');
    if (!res.ok) return;
    const data = await res.json();

    document.getElementById('stat-hubs').textContent = data.total_hubs;
    document.getElementById('stat-active').textContent = data.active_trips;
    document.getElementById('stat-available').textContent = data.available_cycles;
    document.getElementById('stat-maint').textContent = data.maintenance_cycles;
    document.getElementById('stat-trust').textContent = data.avg_trust_score.toFixed(1);
  } catch (e) {
    console.error('Fetch stats error:', e);
  }
}

async function fetchAdminHubs() {
  try {
    const res = await fetch('/api/admin/hubs');
    if (!res.ok) return;
    const hubs = await res.json();

    // Render Admin Map Markers
    if (adminMap) {
      adminHubMarkers.forEach(m => adminMap.removeLayer(m));
      adminHubMarkers = [];

      hubs.forEach(h => {
        const marker = L.circleMarker([h.latitude, h.longitude], {
          radius: 12,
          fillColor: h.available_cycles > 2 ? '#10b981' : (h.available_cycles > 0 ? '#f59e0b' : '#ef4444'),
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9
        }).addTo(adminMap);

        marker.bindPopup(`
          <div style="padding:4px; text-align:center;">
            <strong style="color:#60a5fa; font-size:14px;">${h.name} (${h.code})</strong><br/>
            <span style="font-size:12px; color:#e2e8f0;">Available: <b style="color:#10b981">${h.available_cycles}</b> / ${h.capacity}</span><br/>
            <span style="font-size:11px; color:#94a3b8;">Geofence Radius: ${h.radius_meters}m</span>
          </div>
        `);
        adminHubMarkers.push(marker);
      });
    }

    // Render Hub Table
    const tbody = document.getElementById('hubs-table-body');
    if (tbody) {
      tbody.innerHTML = '';
      hubs.forEach(h => {
        const pct = Math.round((h.available_cycles / h.capacity) * 100);
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-800/40 transition';
        tr.innerHTML = `
          <td class="p-2.5 font-semibold text-white">${h.name}</td>
          <td class="p-2.5 font-mono text-blue-400">${h.code}</td>
          <td class="p-2.5 font-bold text-emerald-400">${h.available_cycles}</td>
          <td class="p-2.5 text-slate-400">${h.capacity}</td>
          <td class="p-2.5">
            <div class="flex items-center gap-2">
              <div class="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div class="bg-blue-500 h-full rounded-full" style="width: ${pct}%"></div>
              </div>
              <span class="text-[10px] text-slate-400">${pct}%</span>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (e) {
    console.error('Fetch admin hubs error:', e);
  }
}

async function fetchRebalanceForecast() {
  try {
    const res = await fetch('/api/admin/rebalance');
    if (!res.ok) return;
    const forecasts = await res.json();

    const container = document.getElementById('rebalance-list');
    if (!container) return;

    container.innerHTML = '';
    forecasts.forEach(item => {
      let sevBg = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      if (item.severity === 'critical') sevBg = 'bg-red-500/20 text-red-400 border-red-500/30';
      else if (item.severity === 'high') sevBg = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      else if (item.severity === 'medium') sevBg = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';

      const card = document.createElement('div');
      card.className = 'p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 space-y-1.5';
      card.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-white">${item.hub_name}</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${sevBg}">
            ${item.severity}
          </span>
        </div>
        <div class="flex justify-between text-[11px] text-slate-400">
          <span>Supply: <strong class="text-white">${item.current_count}</strong></span>
          <span>Forecast Demand: <strong class="text-purple-400">${item.predicted_demand}</strong></span>
          <span>Deficit: <strong class="${item.deficit > 0 ? 'text-red-400' : 'text-emerald-400'}">${item.deficit}</strong></span>
        </div>
        <p class="text-[11px] text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
          ${item.recommended_action}
        </p>
      `;
      container.appendChild(card);
    });
  } catch (e) {
    console.error('Fetch rebalance forecast error:', e);
  }
}

async function fetchStudents() {
  try {
    const res = await fetch('/api/admin/users');
    if (!res.ok) return;
    const users = await res.json();

    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    users.forEach(u => {
      const scoreColor = u.trust_score >= 90 ? 'text-emerald-400' : (u.trust_score >= 75 ? 'text-blue-400' : 'text-amber-400');
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-800/40 transition';
      tr.innerHTML = `
        <td class="p-2.5 font-semibold text-white">${u.name}</td>
        <td class="p-2.5 text-blue-400 font-mono">${u.email}</td>
        <td class="p-2.5 font-black ${scoreColor}">${u.trust_score.toFixed(1)}</td>
        <td class="p-2.5">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-emerald-500/20 text-emerald-400'} border border-slate-700">
            ${u.role.toUpperCase()}
          </span>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error('Fetch students error:', e);
  }
}
