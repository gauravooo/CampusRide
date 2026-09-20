import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  MapPin,
  QrCode,
  Camera,
  Lock,
  Bluetooth,
  CheckCircle2,
  Bike,
  Search,
  ShieldCheck,
  Zap,
  Navigation,
  Battery,
  ChevronRight,
  Sparkles,
  Flame,
  Leaf,
  Layers,
  Award
} from 'lucide-react';
import CampusMap from './CampusMap';
import QRScannerModal from './QRScannerModal';
import ParkingPhotoModal from './ParkingPhotoModal';

export default function StudentView({
  currentUser,
  hubs = [],
  cycles = [],
  activeTrip,
  onStartTrip,
  onEndTrip,
  userLocation
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

  const safeHubs = Array.isArray(hubs) ? hubs : [];
  const safeCycles = Array.isArray(cycles) ? cycles : [];

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
    const cycle = safeCycles.find(
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

  const { nearestHub } = selectedCycle
    ? { nearestHub: safeHubs.find((h) => h.id === selectedCycle.hubId) }
    : { nearestHub: null };

  const withinGeofence = true;
  const availableCycles = safeCycles.filter((c) => c.status === 'available');

  const filteredCycles = availableCycles
    .filter((c) => selectedHubFilter === 'all' || c.hubId === Number(selectedHubFilter))
    .filter(
      (c) =>
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.qrCode.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Top Banner: Active Ride Card (Full Width) */}
      {activeTrip && (
        <div className="glass-card p-5 border-emerald-500/50 bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950 shadow-2xl rounded-3xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-emerald-500/20 pb-3 gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-extrabold border border-emerald-500/30 animate-pulse w-fit">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> ACTIVE CAMPUS RIDE
            </span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-wider font-mono">
              {formatStopwatch(tripSeconds)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center text-xs text-slate-300">
            <div className="p-3 bg-slate-950/80 rounded-2xl border border-white/5">
              <span className="text-slate-400 text-[10px] block font-semibold">Target Cycle</span>
              <strong className="text-white text-sm sm:text-base font-mono">{activeTrip.cycleCode}</strong>
            </div>
            <div className="p-3 bg-slate-950/80 rounded-2xl border border-white/5">
              <span className="text-slate-400 text-[10px] block font-semibold flex items-center justify-center gap-1">
                <Leaf className="w-3 h-3 text-emerald-400" /> CO2 Saved
              </span>
              <strong className="text-emerald-400 text-sm sm:text-base">{Math.round(tripSeconds * 0.15)}g</strong>
            </div>
            <div className="p-3 bg-slate-950/80 rounded-2xl border border-white/5">
              <span className="text-slate-400 text-[10px] block font-semibold flex items-center justify-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" /> Calories
              </span>
              <strong className="text-amber-400 text-sm sm:text-base">{Math.round(tripSeconds * 0.08)} kcal</strong>
            </div>
          </div>

          <button
            onClick={() => setShowEndModal(true)}
            className="w-full btn-success text-xs sm:text-sm py-3.5 flex items-center justify-center gap-2 font-extrabold rounded-2xl shadow-xl shadow-emerald-600/30 transition active:scale-98"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>End Ride & Upload Parking Snapshot</span>
          </button>
        </div>
      )}

      {/* Responsive Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Campus Hubs Map & Fleet Grid (8 Columns on Desktop) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6 order-2 lg:order-1">
          {/* Campus Hubs Map Card */}
          <div className="glass-card p-4 sm:p-5 rounded-3xl space-y-3 bg-slate-900/90 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-400" />
                <span>Campus Hubs Map</span>
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                  {safeHubs.length} Hubs Centered at IIMBG
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                  {availableCycles.length} Cycles Ready
                </span>
              </div>
            </div>

            {/* Responsive Height CampusMap Component */}
            <CampusMap
              hubs={safeHubs}
              cycles={safeCycles}
              height="h-64 sm:h-80 md:h-96 lg:h-[430px]"
              userLocation={userLocation}
              onSelectCycle={(qrCode) => handleScanSuccess(qrCode)}
            />
          </div>

          {/* Fleet Quick Select Card */}
          <div className="glass-card p-4 sm:p-5 rounded-3xl space-y-4 bg-slate-900/90 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2">
                <Bike className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm sm:text-base font-extrabold text-white">Quick Select from 200 Fleet:</h3>
              </div>
              <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                {availableCycles.length} Available
              </span>
            </div>

            {/* Search & Hub Filter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search cycle code e.g. BG-..."
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
                <option value="all">All {safeHubs.length} Campus Hubs</option>
                {safeHubs.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>

            {/* Fleet Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-96 overflow-y-auto pr-1">
              {filteredCycles.map((c) => {
                const h = safeHubs.find((hub) => hub.id === c.hubId);
                return (
                  <div
                    key={c.id}
                    onClick={() => handleScanSuccess(c.qrCode)}
                    className="p-2.5 bg-slate-950/80 hover:bg-blue-950/60 rounded-xl border border-white/10 text-center space-y-1.5 cursor-pointer transition group"
                  >
                    <strong className="text-xs font-black text-white block font-mono group-hover:text-blue-400 transition">
                      {c.code}
                    </strong>
                    <span className="text-[10px] text-slate-400 block truncate">{h?.name || 'Campus Hub'}</span>
                    <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/5 font-mono">
                      <span className="text-emerald-400 font-bold">⚡ {c.batteryPct}%</span>
                      <span className="text-blue-400 font-semibold group-hover:underline">Unlock</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Actions & Trust & Hubs Breakdown (4-5 Columns on Desktop) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6 order-1 lg:order-2">
          {/* Ready to Ride? Action Card */}
          <div className="glass-card p-6 rounded-3xl text-center space-y-4 bg-slate-900/90 border border-slate-800 shadow-xl">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-400 border border-blue-500/30 shadow">
              <QrCode className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-black text-white">Ready to Ride?</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                Scan cycle QR code or select cycle code below to unlock instantly.
              </p>
            </div>

            {/* Large Blue Scan Button */}
            <button
              onClick={() => setShowQRModal(true)}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition active:scale-98"
            >
              <Camera className="w-5 h-5" />
              <span>Scan Cycle QR Code</span>
            </button>

            {/* Quick Select Demo Cycle Dropdown */}
            <div className="space-y-1.5 pt-1 text-left">
              <label className="text-xs text-slate-400 font-semibold text-center block">Quick Select Cycle:</label>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleScanSuccess(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="w-full glass-input text-xs py-2.5 rounded-2xl text-slate-200 bg-slate-950 border-slate-800 font-medium cursor-pointer"
              >
                <option value="">-- Choose Cycle QR --</option>
                {availableCycles.slice(0, 40).map((c) => (
                  <option key={c.id} value={c.qrCode}>
                    {c.code} ({safeHubs.find((h) => h.id === c.hubId)?.name || 'Campus Hub'}) • {c.batteryPct}% Battery
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Student Trust Score Card */}
          <div className="glass-card p-5 rounded-3xl space-y-3 bg-slate-900/90 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-semibold">Student Trust Score</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-black text-blue-400">
                    {currentUser?.trustScore ? currentUser.trustScore.toFixed(1) : '100.0'}
                  </span>
                  <span className="text-sm text-slate-400 font-medium">/100</span>
                </div>
              </div>
              <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>@iimbg.ac.in Verified</span>
              </span>
            </div>

            {/* Gradient Progress Bar */}
            <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden p-0.5 border border-white/5">
              <div
                className="bg-gradient-to-r from-blue-500 via-teal-400 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, currentUser?.trustScore || 100))}%` }}
              />
            </div>

            <div className="pt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
              <div className="p-2 bg-slate-950/60 rounded-xl border border-white/5">
                <span className="text-slate-500 block text-[10px]">Zero Deposit</span>
                <strong className="text-slate-200">Unlocked Privilege</strong>
              </div>
              <div className="p-2 bg-slate-950/60 rounded-xl border border-white/5">
                <span className="text-slate-500 block text-[10px]">Campus Trust Tier</span>
                <strong className="text-emerald-400 font-bold">Elite Standing</strong>
              </div>
            </div>
          </div>

          {/* Designated Campus Hubs Live Availability Card */}
          <div className="glass-card p-5 rounded-3xl space-y-3 bg-slate-900/90 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <h3 className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span>Campus Hubs Live Status</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">{safeHubs.length} Stations</span>
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {safeHubs.map((h) => {
                const count = safeCycles.filter((c) => c.hubId === h.id && c.status === 'available').length;
                const color =
                  count > 3
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                    : count > 0
                    ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                    : 'text-red-400 bg-red-500/10 border-red-500/20';

                return (
                  <div
                    key={h.id}
                    className="p-2.5 bg-slate-950/70 rounded-xl border border-white/5 flex items-center justify-between hover:bg-slate-800/40 transition text-xs"
                  >
                    <div className="truncate pr-2">
                      <strong className="text-slate-200 block truncate text-[11px] font-bold">{h.name}</strong>
                      <span className="text-[10px] text-slate-500 font-mono">{h.code}</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border font-mono whitespace-nowrap ${color}`}>
                      {count} / {h.capacity || 25} 🚲
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

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
        onSubmitEndTrip={(result) => {
          setShowEndModal(false);
          onEndTrip(result);
        }}
        hubs={safeHubs}
        userLocation={userLocation}
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
              <p><span className="text-slate-400">Nearest Station:</span> <strong className="text-white">{nearestHub?.name || 'Academic Block'}</strong></p>
              <p>
                <span className="text-slate-400">Geofence Status:</span>{' '}
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border ${withinGeofence ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                  {withinGeofence ? `GEOFENCE OK (45m)` : `OUTSIDE HUB`}
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
