import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { MapPin, QrCode, Camera, Lock, Bluetooth, CheckCircle2, Bike, Search, ShieldCheck, Zap, Navigation, Battery, ChevronRight, Sparkles, Flame, Leaf, ListFilter, X, Crosshair } from 'lucide-react';
import CampusMap from './CampusMap';
import QRScannerModal from './QRScannerModal';
import ParkingPhotoModal from './ParkingPhotoModal';
import { findNearestHub, haversineDistance } from '../utils/geo';

export default function StudentView({
  currentUser,
  hubs,
  cycles,
  activeTrip,
  onStartTrip,
  onEndTrip,
  userLocation,
  showFleetModal,
  setShowFleetModal
}) {
  const [showQRModal, setShowQRModal] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [showPIN, setShowPIN] = useState(false);
  const [bleConnecting, setBleConnecting] = useState(false);
  const [tripSeconds, setTripSeconds] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHubFilter, setSelectedHubFilter] = useState('all');

  // Active Ride Stopwatch
  useEffect(() => {
    let timer = null;
    if (activeTrip) {
      const startTime = new Date(activeTrip.startTime);
      timer = setInterval(() => {
        const diffMs = Math.max(0, new Date() - startTime);
        setTripSeconds(Math.floor(diffMs / 1000));
      }, 1000);
    } else {
      setTripSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeTrip]);

  const formatStopwatch = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleScanSuccess = (qrPayload) => {
    const cycle = cycles.find(
      (c) =>
        c.qrCode.toLowerCase() === qrPayload.toLowerCase() ||
        c.code.toLowerCase() === qrPayload.toLowerCase() ||
        c.code.toLowerCase().endsWith(qrPayload.toLowerCase())
    );

    if (!cycle) {
      alert(`Cycle code / QR '${qrPayload}' not found in fleet database.`);
      return;
    }

    if (cycle.status === 'in_use') {
      alert('Cycle is currently in active use by another student.');
      return;
    }

    if (cycle.status === 'maintenance') {
      alert('Cycle is undergoing lock servicing.');
      return;
    }

    setSelectedCycle(cycle);
    setShowPIN(false);
    setShowQRModal(false);
    setShowLockModal(true);
  };

  const handleBLEUnlock = () => {
    if (!selectedCycle) return;
    setBleConnecting(true);
    setTimeout(() => {
      setBleConnecting(false);
      setShowLockModal(false);
      onStartTrip(selectedCycle);
    }, 800);
  };

  const handlePINUnlock = () => {
    if (!selectedCycle) return;
    setShowPIN(true);
    setTimeout(() => {
      setShowLockModal(false);
      onStartTrip(selectedCycle);
    }, 1200);
  };

  const { nearestHub, distanceMeters } = selectedCycle
    ? findNearestHub(userLocation.lat, userLocation.lng, hubs)
    : { nearestHub: null, distanceMeters: 0 };

  const withinGeofence = distanceMeters <= (nearestHub?.radius_meters || 60);

  const availableCycles = cycles.filter((c) => c.status === 'available');

  const sortedCyclesWithDistance = availableCycles.map((c) => {
    const dist = Math.round(haversineDistance(userLocation.lat, userLocation.lng, c.lat, c.lng));
    return { ...c, distanceMeters: dist };
  }).sort((a, b) => a.distanceMeters - b.distanceMeters);

  const filteredCycles = sortedCyclesWithDistance
    .filter((c) => selectedHubFilter === 'all' || c.hubId === Number(selectedHubFilter))
    .filter(
      (c) =>
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.qrCode.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="relative w-full h-[calc(100vh-60px)] overflow-hidden">
      {/* Full-Bleed Interactive Map Background */}
      <CampusMap
        hubs={hubs}
        cycles={cycles}
        height="h-full"
        userLocation={userLocation}
        onSelectCycle={(c) => handleScanSuccess(c.qrCode)}
      />

      {/* Active Ride Floating Banner (when ride is active) */}
      {activeTrip && (
        <div className="fixed top-20 left-3 right-3 z-30 max-w-lg mx-auto glass-panel p-4 border-emerald-500/50 bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950 shadow-2xl rounded-3xl space-y-3">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-extrabold border border-emerald-500/30 animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> ACTIVE RIDE
            </span>
            <span className="text-2xl font-black text-emerald-400 tracking-wider font-mono">
              {formatStopwatch(tripSeconds)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-300">
            <div className="p-2 bg-slate-950/80 rounded-2xl border border-white/5">
              <span className="text-slate-400 text-[10px] block font-semibold">Cycle Code</span>
              <strong className="text-white text-sm font-mono">{activeTrip.cycleCode}</strong>
            </div>
            <div className="p-2 bg-slate-950/80 rounded-2xl border border-white/5">
              <span className="text-slate-400 text-[10px] block font-semibold flex items-center justify-center gap-1">
                <Leaf className="w-3 h-3 text-emerald-400" /> CO2 Saved
              </span>
              <strong className="text-emerald-400 text-sm">{Math.round(tripSeconds * 0.15)}g</strong>
            </div>
            <div className="p-2 bg-slate-950/80 rounded-2xl border border-white/5">
              <span className="text-slate-400 text-[10px] block font-semibold flex items-center justify-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" /> Calories
              </span>
              <strong className="text-amber-400 text-sm">{Math.round(tripSeconds * 0.08)} kcal</strong>
            </div>
          </div>

          <button
            onClick={() => setShowEndModal(true)}
            className="w-full btn-success text-xs py-3 flex items-center justify-center gap-2 font-extrabold rounded-2xl shadow-xl shadow-emerald-600/30 transition active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>End Ride & Upload Parking Snapshot</span>
          </button>
        </div>
      )}

      {/* Floating Bottom Slide-Up Action Sheet (NO BOTTOM BUTTONS) */}
      {!activeTrip && (
        <div className="fixed bottom-4 left-3 right-3 z-30 max-w-lg mx-auto glass-panel p-4 rounded-3xl space-y-3.5 shadow-2xl border border-white/15">
          {/* Sheet Drag Handle */}
          <div className="w-12 h-1 bg-white/20 rounded-full mx-auto -mt-1"></div>

          {/* High-Impact Scan QR Button */}
          <button
            onClick={() => setShowQRModal(true)}
            className="w-full btn-hero py-4 flex items-center justify-center gap-3 text-base font-black shadow-2xl rounded-2xl group transition active:scale-98"
          >
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shadow">
              <Camera className="w-5 h-5 text-white group-hover:scale-110 transition" />
            </div>
            <span>SCAN TO UNLOCK BIKE</span>
          </button>

          {/* Nearby Bikes Carousel */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Bike className="w-4 h-4 text-blue-400" />
                <span>Closest Available Bikes ({availableCycles.length})</span>
              </span>
              <button
                onClick={() => setShowFleetModal(true)}
                className="text-[11px] font-bold text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>All Fleet →</span>
              </button>
            </div>

            {/* Horizontal Scrolling Bikes Cards */}
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
              {sortedCyclesWithDistance.slice(0, 10).map((c) => {
                const h = hubs.find((h) => h.id === c.hubId);
                return (
                  <div
                    key={c.id}
                    onClick={() => handleScanSuccess(c.qrCode)}
                    className="flex-shrink-0 w-44 p-3 bg-slate-900/90 hover:bg-slate-800 rounded-2xl border border-white/10 space-y-2 cursor-pointer transition group"
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-xs font-extrabold text-white font-mono">{c.code}</strong>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        ⚡ {c.batteryPct}%
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 space-y-0.5">
                      <p className="truncate text-slate-200 font-semibold">{h?.name || 'Campus Hub'}</p>
                      <p className="font-mono text-blue-400">{c.distanceMeters}m away</p>
                    </div>

                    <button className="w-full py-1.5 bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white text-[11px] font-bold rounded-xl border border-blue-500/30 flex items-center justify-center gap-1 transition">
                      <span>Unlock</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Full Fleet Catalog Modal (Portal on document.body) */}
      {showFleetModal && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-lg p-5 space-y-4 border-blue-500/40 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <ListFilter className="w-5 h-5 text-blue-400" />
                <span>Full Campus Fleet Catalog (200 Cycles)</span>
              </h3>
              <button onClick={() => setShowFleetModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full glass-input text-xs pl-8 py-2 rounded-xl"
                />
              </div>

              <select
                value={selectedHubFilter}
                onChange={(e) => setSelectedHubFilter(e.target.value)}
                className="w-full glass-input text-xs py-2 rounded-xl"
              >
                <option value="all">All 10 Hubs</option>
                {hubs.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>

            <div className="overflow-y-auto space-y-2 pr-1 flex-1">
              {filteredCycles.map((c) => {
                const h = hubs.find((h) => h.id === c.hubId);
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setShowFleetModal(false);
                      handleScanSuccess(c.qrCode);
                    }}
                    className="p-3 bg-slate-900/80 hover:bg-slate-800 rounded-2xl border border-white/5 flex items-center justify-between cursor-pointer transition group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400 border border-blue-500/30 font-bold text-xs">
                        🚲
                      </div>
                      <div>
                        <strong className="text-xs font-bold text-white block">{c.code}</strong>
                        <span className="text-[10px] text-slate-400">{h?.name || 'Campus Hub'}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-400 block">⚡ {c.batteryPct}%</span>
                        <span className="text-[10px] text-slate-400 font-mono">PIN: {c.lockPin}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Web Camera QR Scanner Modal (Portal on document.body) */}
      <QRScannerModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        onScanSuccess={handleScanSuccess}
        availableCycles={availableCycles}
      />

      {/* Device Camera Parking Photo Verification Modal (Portal on document.body) */}
      <ParkingPhotoModal
        isOpen={showEndModal}
        onClose={() => setShowEndModal(false)}
        onSubmitEndTrip={onEndTrip}
      />

      {/* Dual Lock Unlock Engine Modal (Portal on document.body) */}
      {showLockModal && selectedCycle && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm p-5 space-y-4 border-blue-500/40 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-400" />
                <span>Dual Lock Unlock Engine</span>
              </h3>
              <button onClick={() => setShowLockModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-2xl space-y-1 text-xs text-slate-300 border border-white/10">
              <p><span className="text-slate-400">Target Cycle:</span> <strong className="text-blue-400 text-sm font-mono">{selectedCycle.code}</strong></p>
              <p><span className="text-slate-400">Nearest Station:</span> <strong className="text-white">{nearestHub?.name || 'Campus Station'}</strong></p>
              <p>
                <span className="text-slate-400">Geofence Status:</span>{' '}
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border ${withinGeofence ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                  {withinGeofence ? `GEOFENCE OK (${distanceMeters}m)` : `OUTSIDE HUB (${distanceMeters}m)`}
                </span>
              </p>
            </div>

            {/* Option A: PIN Reveal */}
            <div className="p-3.5 bg-slate-900/80 rounded-2xl border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Option A: 4-Digit PIN Reveal</span>
                <span className="text-[10px] text-slate-400">Manual Keylock</span>
              </div>
              {showPIN && (
                <div className="text-center py-2.5 bg-black rounded-xl text-3xl font-black tracking-widest text-emerald-400 border border-emerald-500/40">
                  {selectedCycle.lockPin}
                </div>
              )}
              <button
                onClick={handlePINUnlock}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition border border-white/10"
              >
                Reveal 4-Digit Unlock PIN
              </button>
            </div>

            {/* Option B: BLE Smart Lock Pulse */}
            <div className="p-3.5 bg-blue-950/40 rounded-2xl border border-blue-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-300">Option B: Virtual BLE Lock Pulse</span>
                <span className="text-[10px] text-blue-400 font-mono">{selectedCycle.bleMac}</span>
              </div>
              <button
                onClick={handleBLEUnlock}
                disabled={bleConnecting}
                className="w-full btn-primary text-xs py-3 flex items-center justify-center gap-2 font-bold pulse-ble rounded-xl"
              >
                <Bluetooth className="w-4 h-4" />
                <span>{bleConnecting ? 'Transmitting Smart Signal...' : 'Send BLE Unlock Pulse'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
