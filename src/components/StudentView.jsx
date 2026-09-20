import React, { useState, useEffect } from 'react';
import { MapPin, QrCode, Camera, Lock, Bluetooth, CheckCircle2, Bike, Search, ShieldCheck, Zap, Navigation, Battery, ChevronRight, Sparkles, SlidersHorizontal, Flame, Leaf } from 'lucide-react';
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
  userLocation
}) {
  const [mobileTab, setMobileTab] = useState('ride'); // 'ride', 'map', 'profile'
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

  // Compute distance for each available cycle to user location
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
    <div className="max-w-xl mx-auto space-y-4 pb-28">
      {/* Active Ride Card Banner */}
      {activeTrip && (
        <div className="glass-card p-5 border-emerald-500/50 bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 shadow-2xl shadow-emerald-950/50 rounded-3xl space-y-3">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> ACTIVE RIDE
            </span>
            <span className="text-2xl font-black text-emerald-400 tracking-wider font-mono">
              {formatStopwatch(tripSeconds)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-300">
            <div className="p-2.5 bg-slate-900/90 rounded-2xl border border-white/5">
              <span className="text-slate-400 text-[10px] block font-semibold">Cycle Code</span>
              <strong className="text-white text-sm font-mono">{activeTrip.cycleCode}</strong>
            </div>
            <div className="p-2.5 bg-slate-900/90 rounded-2xl border border-white/5">
              <span className="text-slate-400 text-[10px] block font-semibold flex items-center justify-center gap-1">
                <Leaf className="w-3 h-3 text-emerald-400" /> CO2 Saved
              </span>
              <strong className="text-emerald-400 text-sm">{Math.round(tripSeconds * 0.15)}g</strong>
            </div>
            <div className="p-2.5 bg-slate-900/90 rounded-2xl border border-white/5">
              <span className="text-slate-400 text-[10px] block font-semibold flex items-center justify-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" /> Calories
              </span>
              <strong className="text-amber-400 text-sm">{Math.round(tripSeconds * 0.08)} kcal</strong>
            </div>
          </div>

          <button
            onClick={() => setShowEndModal(true)}
            className="w-full btn-success text-sm py-3.5 flex items-center justify-center gap-2 font-extrabold rounded-2xl shadow-xl shadow-emerald-600/30 transition active:scale-95"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>End Ride & Upload Parking Snapshot</span>
          </button>
        </div>
      )}

      {/* Main Tab Content */}
      {mobileTab === 'ride' && (
        <div className="space-y-4">
          {/* Top Interactive Campus Map Banner */}
          <div className="relative">
            <CampusMap
              hubs={hubs}
              cycles={cycles}
              height="h-72 md:h-80"
              userLocation={userLocation}
              onSelectCycle={(c) => handleScanSuccess(c.qrCode)}
            />

            {/* Floating Top Map Header Tag */}
            <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
              <span className="px-3 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md text-white text-xs font-bold border border-white/10 shadow-lg flex items-center gap-1.5 pointer-events-auto">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>200 Fleet • 10 Hubs</span>
              </span>
              <span className="px-3 py-1.5 rounded-full bg-blue-600/90 backdrop-blur-md text-white text-xs font-bold border border-blue-400/30 shadow-lg flex items-center gap-1 pointer-events-auto">
                <Navigation className="w-3.5 h-3.5" /> IIM Bodh Gaya
              </span>
            </div>
          </div>

          {/* Primary Action Button Bar */}
          <div className="glass-card p-4 space-y-3 rounded-3xl bg-gradient-to-br from-blue-900/30 via-slate-900 to-slate-950 border-blue-500/30 shadow-2xl">
            <button
              onClick={() => setShowQRModal(true)}
              className="w-full btn-primary py-4 flex items-center justify-center gap-3 text-base font-extrabold shadow-xl shadow-blue-600/40 rounded-2xl group transition active:scale-98"
            >
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <Camera className="w-5 h-5 text-white group-hover:scale-110 transition" />
              </div>
              <span>Scan QR Code To Unlock</span>
            </button>
          </div>

          {/* Student Trust Tier Badge Card */}
          <div className="glass-card p-4 space-y-2.5 rounded-3xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Campus Rider Rating</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-2xl font-black text-blue-400">
                    {currentUser?.trustScore.toFixed(1) || '98.5'}
                  </span>
                  <span className="text-xs text-slate-400">/ 100.0</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 ml-2">
                    GOLD RIDER
                  </span>
                </div>
              </div>
              <ShieldCheck className="w-9 h-9 text-blue-400" />
            </div>

            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 via-emerald-400 to-amber-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, currentUser?.trustScore || 100))}%` }}
              />
            </div>
          </div>

          {/* Fleet Quick Selector & Search */}
          <div className="glass-card p-4 space-y-3 rounded-3xl">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Bike className="w-4 h-4 text-blue-400" />
                <span>Nearby Available Cycles ({availableCycles.length})</span>
              </h4>
              <span className="text-[10px] text-slate-400">Sorted by distance</span>
            </div>

            {/* Filter & Search Bar */}
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter cycle..."
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

            {/* Available Cycles Cards Grid */}
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {filteredCycles.slice(0, 30).map((c) => {
                const h = hubs.find((h) => h.id === c.hubId);
                return (
                  <div
                    key={c.id}
                    onClick={() => handleScanSuccess(c.qrCode)}
                    className="p-3 bg-slate-900/70 hover:bg-slate-800 rounded-2xl border border-white/5 flex items-center justify-between cursor-pointer transition group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400 border border-blue-500/30 group-hover:scale-105 transition text-base">
                        🚲
                      </div>
                      <div>
                        <strong className="text-sm font-bold text-white block leading-tight">{c.code}</strong>
                        <span className="text-[10px] text-slate-400">{h?.name || 'Campus Hub'}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-400 block">
                          ⚡ {c.batteryPct}%
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {c.distanceMeters}m away
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Map Tab */}
      {mobileTab === 'map' && (
        <div className="glass-card p-4 space-y-3 rounded-3xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-400" />
              <span>Campus Geofenced Hubs</span>
            </h3>
            <span className="text-xs text-slate-400">10 Station Hubs</span>
          </div>
          <CampusMap hubs={hubs} cycles={cycles} height="h-96" userLocation={userLocation} />

          <div className="space-y-2 pt-2">
            {hubs.map((h) => {
              const avail = cycles.filter((c) => c.hubId === h.id && c.status === 'available').length;
              return (
                <div key={h.id} className="p-3 bg-slate-900/70 rounded-2xl border border-white/5 flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-white text-sm block">{h.name}</strong>
                    <span className="text-[10px] text-slate-400">{h.description}</span>
                  </div>
                  <span className={`px-3 py-1 rounded-xl text-[10px] font-extrabold border ${avail > 0 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                    🚲 {avail} / {h.capacity} Free
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Profile Tab */}
      {mobileTab === 'profile' && (
        <div className="glass-card p-6 space-y-4 text-center rounded-3xl">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 border-2 border-blue-400 flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-blue-600/30">
            {currentUser?.name ? currentUser.name.charAt(0) : 'S'}
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-white">{currentUser?.name || 'Campus Student'}</h3>
            <p className="text-xs text-blue-400 font-mono mt-0.5">{currentUser?.email || 'student@iimbg.ac.in'}</p>
          </div>

          <div className="p-4 bg-slate-950/70 rounded-2xl space-y-3 text-xs border border-white/10 text-left">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Campus Verification:</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" /> @iimbg.ac.in Verified
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-800 pt-2.5">
              <span className="text-slate-400">Trust Score Rating:</span>
              <span className="text-blue-400 font-black text-sm">{currentUser?.trustScore.toFixed(1) || '98.5'} / 100</span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-800 pt-2.5">
              <span className="text-slate-400">Total Campus Rides:</span>
              <span className="text-white font-bold">15 Rides</span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Mobile Bottom Bar */}
      <div className="fixed bottom-3 left-3 right-3 z-40 max-w-md mx-auto bg-slate-950/90 backdrop-blur-2xl border border-white/10 rounded-3xl py-2 px-6 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => setMobileTab('ride')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition ${mobileTab === 'ride' ? 'text-blue-400 scale-105' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Bike className="w-5 h-5" />
          <span>Ride</span>
        </button>

        <button
          onClick={() => setMobileTab('map')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition ${mobileTab === 'map' ? 'text-blue-400 scale-105' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <MapPin className="w-5 h-5" />
          <span>Map</span>
        </button>

        {/* Central QR Camera Trigger */}
        <button
          onClick={() => setShowQRModal(true)}
          className="flex flex-col items-center gap-1 text-[10px] font-bold text-blue-400 -mt-6"
        >
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-xl shadow-blue-600/50 border-4 border-slate-900 active:scale-95 transition">
            <Camera className="w-7 h-7" />
          </div>
          <span className="text-white font-extrabold mt-0.5">Scan QR</span>
        </button>

        <button
          onClick={() => setMobileTab('profile')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold transition ${mobileTab === 'profile' ? 'text-blue-400 scale-105' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <ShieldCheck className="w-5 h-5" />
          <span>Profile</span>
        </button>
      </div>

      {/* Web Camera QR Scanner Modal */}
      <QRScannerModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        onScanSuccess={handleScanSuccess}
        availableCycles={availableCycles}
      />

      {/* Device Camera Parking Photo Verification Modal */}
      <ParkingPhotoModal
        isOpen={showEndModal}
        onClose={() => setShowEndModal(false)}
        onSubmitEndTrip={onEndTrip}
      />

      {/* Dual Lock Unlock Engine Modal */}
      {showLockModal && selectedCycle && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm p-5 space-y-4 border-blue-500/40 rounded-3xl shadow-2xl">
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
        </div>
      )}
    </div>
  );
}
