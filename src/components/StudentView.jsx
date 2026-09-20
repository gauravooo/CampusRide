import React, { useState, useEffect } from 'react';
import { MapPin, QrCode, Camera, Lock, Bluetooth, CheckCircle, Smartphone, UserCheck, Bike, Search } from 'lucide-react';
import CampusMap from './CampusMap';
import QRScannerModal from './QRScannerModal';
import ParkingPhotoModal from './ParkingPhotoModal';
import { findNearestHub } from '../utils/geo';

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

  // Active Trip Stopwatch
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
      (c) => c.qrCode.toLowerCase() === qrPayload.toLowerCase() || c.code.toLowerCase() === qrPayload.toLowerCase()
    );

    if (!cycle) {
      alert(`Cycle with code / QR '${qrPayload}' not found.`);
      return;
    }

    if (cycle.status === 'in_use') {
      alert('Cycle is currently in use by another student.');
      return;
    }

    if (cycle.status === 'maintenance') {
      alert('Cycle is undergoing maintenance.');
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

  const filteredCycles = cycles
    .filter((c) => c.status === 'available')
    .filter((c) => c.code.toLowerCase().includes(searchQuery.toLowerCase()) || c.qrCode.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 30);

  return (
    <div className="max-w-md mx-auto space-y-4 pb-20">
      {/* Active Ride Card */}
      {activeTrip && (
        <div className="glass-card p-4 border-emerald-500/40 bg-emerald-950/30">
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span> ACTIVE RIDE
            </span>
            <span className="text-xl font-extrabold text-emerald-400 tracking-wider font-mono">
              {formatStopwatch(tripSeconds)}
            </span>
          </div>
          <div className="text-xs text-slate-300 space-y-1 mb-3">
            <p>
              <span className="text-slate-400">Cycle Code:</span>{' '}
              <strong className="text-white">{activeTrip.cycleCode}</strong>
            </p>
            <p>
              <span className="text-slate-400">Lock Battery:</span>{' '}
              <strong className="text-emerald-400">{activeTrip.batteryPct}%</strong> (BLE Signal Active)
            </p>
          </div>
          <button
            onClick={() => setShowEndModal(true)}
            className="w-full btn-success text-sm py-2.5 flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            <span>End Ride & Verify Parking</span>
          </button>
        </div>
      )}

      {/* Main Tab Content */}
      {mobileTab === 'ride' && (
        <div className="space-y-4">
          {/* Student Trust Score */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-xs text-slate-400 font-medium">Student Trust Score</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-blue-400">
                    {currentUser?.trustScore.toFixed(1) || '100.0'}
                  </span>
                  <span className="text-xs text-slate-400">/ 100</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                @iimbg.ac.in Verified
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, currentUser?.trustScore || 100))}%` }}
              />
            </div>
          </div>

          {/* Large Web Camera QR Scanner Card */}
          <div className="glass-card p-5 text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <QrCode className="w-9 h-9" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Unlock Campus Cycle</h3>
              <p className="text-xs text-slate-400">Point your phone camera at cycle QR code to unlock</p>
            </div>

            <button
              onClick={() => setShowQRModal(true)}
              className="w-full btn-primary text-sm py-3.5 flex items-center justify-center gap-2 font-bold shadow-lg shadow-blue-600/30"
            >
              <Camera className="w-5 h-5" />
              <span>Open Web Camera QR Scanner</span>
            </button>
          </div>

          {/* Fleet Quick Selector */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Bike className="w-4 h-4 text-blue-400" />
                <span>Quick Select from 200 Fleet:</span>
              </h4>
              <span className="text-[10px] text-slate-400">{cycles.filter(c => c.status === 'available').length} Available</span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search cycle code e.g. BG-CYCLE-001"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full glass-input text-xs pl-9"
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {filteredCycles.map((c) => {
                const h = hubs.find((h) => h.id === c.hubId);
                return (
                  <button
                    key={c.id}
                    onClick={() => handleScanSuccess(c.qrCode)}
                    className="w-full p-2 bg-slate-800/40 hover:bg-slate-700/60 rounded-xl border border-slate-700/50 flex items-center justify-between text-xs text-left transition"
                  >
                    <div>
                      <strong className="text-blue-400 block">{c.code}</strong>
                      <span className="text-[10px] text-slate-400">{h?.name || 'Campus'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-emerald-400 font-bold block">{c.batteryPct}% Battery</span>
                      <span className="text-[10px] text-slate-500 font-mono">PIN: {c.lockPin}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {mobileTab === 'map' && (
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-blue-400" />
              <span>Campus Hubs & Fleet Map</span>
            </h3>
            <span className="text-xs text-slate-400">10 Hubs • IIM Bodh Gaya</span>
          </div>
          <CampusMap hubs={hubs} cycles={cycles} height="h-80" />

          {/* Hub list */}
          <div className="space-y-2 pt-2">
            {hubs.map((h) => {
              const avail = cycles.filter((c) => c.hubId === h.id && c.status === 'available').length;
              return (
                <div key={h.id} className="p-2.5 bg-slate-800/40 rounded-xl border border-slate-700/50 flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-white block">{h.name}</strong>
                    <span className="text-[10px] text-slate-400">{h.description}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${avail > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {avail} / {h.capacity} Cycles
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mobileTab === 'profile' && (
        <div className="glass-card p-5 space-y-4 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xl font-bold">
            {currentUser?.name ? currentUser.name.charAt(0) : 'S'}
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{currentUser?.name || 'Campus Student'}</h3>
            <p className="text-xs text-blue-400 font-mono">{currentUser?.email || 'student@iimbg.ac.in'}</p>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl space-y-2 text-xs border border-slate-800 text-left">
            <div className="flex justify-between">
              <span className="text-slate-400">Campus Verification:</span>
              <span className="text-emerald-400 font-bold">Passed (@iimbg.ac.in)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Geofence Compliance:</span>
              <span className="text-blue-400 font-bold">98.5% Compliant</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Campus Rides:</span>
              <span className="text-white font-bold">14 Rides Completed</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Mobile Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 py-2 px-6 flex items-center justify-around">
        <button
          onClick={() => setMobileTab('ride')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${mobileTab === 'ride' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Bike className="w-5 h-5" />
          <span>Ride</span>
        </button>

        <button
          onClick={() => setMobileTab('map')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${mobileTab === 'map' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <MapPin className="w-5 h-5" />
          <span>Map</span>
        </button>

        <button
          onClick={() => setShowQRModal(true)}
          className="flex flex-col items-center gap-1 text-[10px] font-bold text-blue-400 -mt-5"
        >
          <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/40 border-2 border-slate-900">
            <Camera className="w-6 h-6" />
          </div>
          <span>Scan</span>
        </button>

        <button
          onClick={() => setMobileTab('profile')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold ${mobileTab === 'profile' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <UserCheck className="w-5 h-5" />
          <span>Profile</span>
        </button>
      </div>

      {/* Real Web Camera QR Scanner Modal */}
      <QRScannerModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        onScanSuccess={handleScanSuccess}
      />

      {/* Real Camera Parking Photo Verification Modal */}
      <ParkingPhotoModal
        isOpen={showEndModal}
        onClose={() => setShowEndModal(false)}
        onSubmitEndTrip={onEndTrip}
      />

      {/* Dual Lock Modal */}
      {showLockModal && selectedCycle && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm p-5 space-y-4 border-blue-500/30">
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-400" />
                <span>Dual Lock Unlock Engine</span>
              </h3>
              <button onClick={() => setShowLockModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-xl space-y-1 text-xs text-slate-300 border border-slate-800">
              <p><span className="text-slate-400">Target Cycle:</span> <strong className="text-blue-400">{selectedCycle.code}</strong></p>
              <p><span className="text-slate-400">Nearest Hub:</span> <strong className="text-white">{nearestHub?.name || 'Academic Block'}</strong></p>
              <p>
                <span className="text-slate-400">Geofence Check:</span>{' '}
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${withinGeofence ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>
                  {withinGeofence ? `GEOFENCE OK (${distanceMeters}m)` : `OUTSIDE HUB (${distanceMeters}m)`}
                </span>
              </p>
            </div>

            {/* Option A: PIN Reveal */}
            <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Option A: Manual PIN Reveal</span>
                <span className="text-[10px] text-slate-400">4-Digit Lock</span>
              </div>
              {showPIN && (
                <div className="text-center py-2 bg-slate-950 rounded-lg text-2xl font-black tracking-widest text-emerald-400 border border-emerald-500/30">
                  {selectedCycle.lockPin}
                </div>
              )}
              <button
                onClick={handlePINUnlock}
                className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition"
              >
                Reveal 4-Digit Unlock PIN
              </button>
            </div>

            {/* Option B: BLE / IoT Unlock Trigger */}
            <div className="p-3 bg-blue-950/30 rounded-xl border border-blue-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-300">Option B: Virtual BLE Smart Lock Pulse</span>
                <span className="text-[10px] text-blue-400 font-mono">{selectedCycle.bleMac}</span>
              </div>
              <button
                onClick={handleBLEUnlock}
                disabled={bleConnecting}
                className="w-full btn-primary text-xs py-2.5 flex items-center justify-center gap-2 pulse-ble"
              >
                <Bluetooth className="w-4 h-4" />
                <span>{bleConnecting ? 'Transmitting Signal...' : 'Send BLE Unlock Pulse'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
