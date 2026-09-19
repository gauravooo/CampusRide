// CampusRide Mobile PWA JavaScript Logic

let currentUser = null;
let currentToken = localStorage.getItem('campus_token') || '';
let userLat = 24.6961;
let userLng = 84.9869;
let campusMap = null;
let hubMarkers = [];
let activeTripTimer = null;
let activeTripSeconds = 0;
let currentScannedCycle = null;

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => console.log('[PWA] ServiceWorker registered scope:', reg.scope))
      .catch(err => console.error('[PWA] ServiceWorker registration failed:', err));
  });
}

// Initialize on DOM Load
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();
  getUserLocation();
  initMap();
  checkAuthStatus();
  fetchCampusData();
});

// Geolocation API
function getUserLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userLat = pos.coords.latitude;
        userLng = pos.coords.longitude;
        console.log('[GPS] User coordinates:', userLat, userLng);
      },
      (err) => {
        console.warn('[GPS] Location access denied or timeout. Using campus center defaults.', err);
      },
      { timeout: 5000 }
    );
  }
}

// Auth Status & User Profile
async function checkAuthStatus() {
  if (!currentToken) {
    // Attempt automatic bypass login for seamless testing experience
    submitDevBypass('student');
    return;
  }
  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    if (res.ok) {
      currentUser = await res.json();
      updateUserUI();
      checkActiveTrip();
    } else {
      submitDevBypass('student');
    }
  } catch (e) {
    console.error('Auth error:', e);
  }
}

function updateUserUI() {
  if (!currentUser) return;
  const headerAction = document.getElementById('auth-header-action');
  if (headerAction) {
    headerAction.innerHTML = `
      <div class="flex items-center gap-2">
        <div class="text-right hidden sm:block">
          <p class="text-xs font-bold text-white">${currentUser.name}</p>
          <p class="text-[10px] text-blue-400 font-medium">${currentUser.email}</p>
        </div>
        <button onclick="openAuthModal()" class="px-2.5 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-bold border border-blue-500/30">
          ${currentUser.role.toUpperCase()}
        </button>
      </div>
    `;
  }

  const trustScoreElem = document.getElementById('user-trust-score');
  if (trustScoreElem) trustScoreElem.textContent = currentUser.trust_score.toFixed(1);

  const trustBar = document.getElementById('trust-bar');
  if (trustBar) trustBar.style.width = `${Math.min(100, Math.max(0, currentUser.trust_score))}%`;
}

// Dev Bypass Login
async function submitDevBypass(role = 'student') {
  try {
    const res = await fetch(`/api/auth/bypass?role=${role}`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      currentToken = data.access_token;
      currentUser = data.user;
      localStorage.setItem('campus_token', currentToken);
      updateUserUI();
      closeAuthModal();
      checkActiveTrip();
    }
  } catch (e) {
    console.error('Dev bypass login error:', e);
  }
}

// Google SSO Login Submission
async function submitAuthLogin() {
  const emailInput = document.getElementById('auth-email-input').value.trim();
  const nameInput = document.getElementById('auth-name-input').value.trim();

  if (!emailInput) {
    alert('Please enter an @iimbg.ac.in email address.');
    return;
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailInput, name: nameInput })
    });

    const data = await res.json();
    if (res.ok) {
      currentToken = data.access_token;
      currentUser = data.user;
      localStorage.setItem('campus_token', currentToken);
      updateUserUI();
      closeAuthModal();
      checkActiveTrip();
      alert(`Welcome, ${currentUser.name}! SSO Domain Verified.`);
    } else {
      alert(`Login Error: ${data.detail}`);
    }
  } catch (e) {
    alert('Failed to execute login request.');
  }
}

// Initialize Leaflet Map
function initMap() {
  const mapElem = document.getElementById('map');
  if (!mapElem) return;

  campusMap = L.map('map').setView([24.6961, 84.9869], 16);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 19
  }).addTo(campusMap);
}

// Fetch Campus Hubs & Cycles
async function fetchCampusData() {
  try {
    const res = await fetch('/api/admin/hubs');
    if (!res.ok) return;
    const hubs = await res.json();

    // Populate Leaflet Map Markers
    if (campusMap) {
      hubMarkers.forEach(m => campusMap.removeLayer(m));
      hubMarkers = [];

      hubs.forEach(h => {
        const marker = L.circleMarker([h.latitude, h.longitude], {
          radius: 9,
          fillColor: h.available_cycles > 0 ? '#10b981' : '#f59e0b',
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.85
        }).addTo(campusMap);

        marker.bindPopup(`
          <div style="text-align:center;">
            <strong style="color:#60a5fa; font-size:13px;">${h.name}</strong><br/>
            <span style="font-size:11px; color:#cbd5e1;">Code: ${h.code}</span><br/>
            <span style="font-size:12px; font-weight:bold; color:#10b981;">🚲 ${h.available_cycles} Cycles Available</span>
          </div>
        `);
        hubMarkers.push(marker);
      });
    }

    // Populate Quick Select Dropdown
    const selectElem = document.getElementById('quick-cycle-select');
    if (selectElem) {
      selectElem.innerHTML = '<option value="">-- Choose Cycle QR --</option>';
      hubs.forEach(h => {
        if (h.cycles && h.cycles.length > 0) {
          h.cycles.forEach(c => {
            if (c.status === 'available') {
              const opt = document.createElement('option');
              opt.value = `IIMBG-RIDE-${c.id < 10 ? '00' + c.id : '0' + c.id}`;
              opt.textContent = `${c.code} (${h.name} - ${c.battery_pct}% Battery)`;
              selectElem.appendChild(opt);
            }
          });
        }
      });
    }

  } catch (e) {
    console.error('Fetch campus data error:', e);
  }
}

// QR Code Scanning & Selection
function onQuickSelectCycle(qrVal) {
  if (qrVal) {
    scanCyclePayload(qrVal);
  }
}

function processManualQR() {
  const inputVal = document.getElementById('manual-qr-input').value.trim();
  if (inputVal) {
    scanCyclePayload(inputVal);
    closeQRModal();
  }
}

async function scanCyclePayload(qrPayload) {
  try {
    const res = await fetch(`/api/cycles/scan/${encodeURIComponent(qrPayload)}?lat=${userLat}&lng=${userLng}`);
    const data = await res.json();

    if (!res.ok) {
      alert(data.detail || 'Scan lookup failed');
      return;
    }

    currentScannedCycle = data;
    openLockModal(data);
  } catch (e) {
    alert('Scan request failed');
  }
}

// Lock Modal & Dual Lock Mechanism
function openLockModal(scanData) {
  document.getElementById('modal-cycle-code').textContent = scanData.cycle.code;
  document.getElementById('modal-hub-name').textContent = scanData.nearest_hub ? scanData.nearest_hub.name : 'Campus Precinct';
  
  const geoBadge = document.getElementById('modal-geofence-badge');
  if (scanData.within_geofence) {
    geoBadge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    geoBadge.textContent = `GEOFENCE OK (${scanData.distance_to_hub_meters}m)`;
  } else {
    geoBadge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30';
    geoBadge.textContent = `OUTSIDE HUB GEOFENCE (${scanData.distance_to_hub_meters}m)`;
  }

  document.getElementById('modal-ble-mac').textContent = scanData.ble_mac;
  
  const pinDisplay = document.getElementById('pin-display');
  pinDisplay.classList.add('hidden');
  pinDisplay.textContent = '----';

  const modal = document.getElementById('lock-modal');
  modal.classList.remove('hidden');
}

function revealLockPIN() {
  if (!currentScannedCycle) return;
  const pinDisplay = document.getElementById('pin-display');
  pinDisplay.textContent = currentScannedCycle.lock_pin;
  pinDisplay.classList.remove('hidden');

  // Trigger trip start via Option A PIN
  startTripRequest(currentScannedCycle.cycle.code);
}

async function triggerBLEUnlock() {
  if (!currentScannedCycle) return;
  
  const bleBtn = document.getElementById('ble-btn');
  bleBtn.innerHTML = `<span class="animate-spin">⏳</span> Connecting to Smart Lock ${currentScannedCycle.ble_mac}...`;

  try {
    const iotRes = await fetch('/api/iot/unlock', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({
        cycle_code: currentScannedCycle.cycle.code,
        unlock_method: 'BLE',
        ble_mac: currentScannedCycle.ble_mac
      })
    });

    if (iotRes.ok) {
      setTimeout(() => {
        closeLockModal();
        startTripRequest(currentScannedCycle.cycle.code);
      }, 800);
    } else {
      alert('BLE Smart Lock unlock trigger failed.');
    }
  } catch (e) {
    alert('BLE Signal error.');
  } finally {
    bleBtn.innerHTML = `<i data-lucide="bluetooth" class="w-4 h-4"></i><span>Send BLE Unlock Pulse</span>`;
    if (window.lucide) lucide.createIcons();
  }
}

// Start Trip Logic
async function startTripRequest(cycleCode) {
  try {
    const res = await fetch('/api/trips/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({
        cycle_code: cycleCode,
        user_lat: userLat,
        user_lng: userLng
      })
    });

    const tripData = await res.json();
    if (res.ok) {
      closeLockModal();
      checkActiveTrip();
      fetchCampusData();
      alert(`🚴 Cycle ${cycleCode} Unlocked! Active ride started.`);
    } else {
      alert(tripData.detail || 'Could not start trip.');
    }
  } catch (e) {
    console.error('Start trip error:', e);
  }
}

// Active Trip Handling
async function checkActiveTrip() {
  if (!currentToken) return;
  try {
    const res = await fetch('/api/trips/active', {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });

    const activeTripCard = document.getElementById('active-trip-card');

    if (res.ok) {
      const trip = await res.json();
      activeTripCard.classList.remove('hidden');

      document.getElementById('active-cycle-code').textContent = `CYCLE #${trip.cycle_id}`;
      startStopwatch(new Date(trip.start_time));
    } else {
      activeTripCard.classList.add('hidden');
      stopStopwatch();
    }
  } catch (e) {
    console.error('Check active trip error:', e);
  }
}

function startStopwatch(startTime) {
  stopStopwatch();
  activeTripTimer = setInterval(() => {
    const now = new Date();
    const diffMs = Math.max(0, now - startTime);
    const secs = Math.floor(diffMs / 1000) % 60;
    const mins = Math.floor(diffMs / 60000) % 60;
    const hrs = Math.floor(diffMs / 3600000);

    const formatted = `${hrs < 10 ? '0' + hrs : hrs}:${mins < 10 ? '0' + mins : mins}:${secs < 10 ? '0' + secs : secs}`;
    const elem = document.getElementById('trip-stopwatch');
    if (elem) elem.textContent = formatted;
  }, 1000);
}

function stopStopwatch() {
  if (activeTripTimer) clearInterval(activeTripTimer);
  activeTripTimer = null;
}

// End Trip & AI Photo Verification
function openEndTripModal() {
  document.getElementById('end-trip-modal').classList.remove('hidden');
}

function closeEndTripModal() {
  document.getElementById('end-trip-modal').classList.add('hidden');
}

function simulatePhotoCapture() {
  const container = document.getElementById('photo-preview-container');
  container.innerHTML = `
    <div class="w-full h-full bg-slate-900 flex flex-col items-center justify-center border border-emerald-500/50 rounded-lg p-2 text-emerald-400">
      <i data-lucide="check-circle" class="w-8 h-8 mb-1"></i>
      <span class="text-xs font-bold">Cycle Lock Snapshot Captured</span>
      <span class="text-[10px] text-slate-400">ONNX Ready for Inference</span>
    </div>
  `;
  if (window.lucide) lucide.createIcons();
}

async function submitEndTrip() {
  try {
    const resActive = await fetch('/api/trips/active', {
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    if (!resActive.ok) return;
    const trip = await resActive.json();

    const resEnd = await fetch('/api/trips/end', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({
        trip_id: trip.id,
        user_lat: userLat,
        user_lng: userLng,
        photo_base64: 'data:image/jpeg;base64,mock_onnx_yolo_snapshot_payload_iimbg'
      })
    });

    const endResult = await resEnd.json();
    if (resEnd.ok) {
      closeEndTripModal();
      checkActiveTrip();
      checkAuthStatus();
      fetchCampusData();

      const scoreMsg = endResult.photo_verified ? 
        `🎉 Ride Completed! AI Verification Passed (${(endResult.verification_score*100).toFixed(0)}% confidence). Trust Score +2.0` : 
        `⚠️ Ride Completed! Drop-off out of hub boundary. Trust Score adjusted (${endResult.trust_score_delta} pts).`;
      
      alert(scoreMsg);
    } else {
      alert(endResult.detail || 'Failed to end trip.');
    }
  } catch (e) {
    alert('End trip request error.');
  }
}

// Modal Toggle Helpers
function openAuthModal() { document.getElementById('auth-modal').classList.remove('hidden'); }
function closeAuthModal() { document.getElementById('auth-modal').classList.add('hidden'); }
function openQRModal() { document.getElementById('qr-modal').classList.remove('hidden'); }
function closeQRModal() { document.getElementById('qr-modal').classList.add('hidden'); }
function closeLockModal() { document.getElementById('lock-modal').classList.add('hidden'); }
