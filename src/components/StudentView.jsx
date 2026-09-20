import React, { useState, useEffect } from 'react';
import { MapPin, QrCode, Camera, Focus, Lock, Bluetooth, CheckCircle, Aperture, X } from 'lucide-react';
import CampusMap from './CampusMap';
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
  const [showQRModal, setShowQRModal] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [showPIN, setShowPIN] = useState(false);
  const [bleConnecting, setBleConnecting] = useState(false);
  const [manualQRInput, setManualQRInput] = useState('');
  const [tripSeconds, setTripSeconds] = useState(0);
  const [photoCaptured, setPhotoCaptured] = useState(false);

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

  const handleScanCode = (qrPayload) => {
    const cycle = cycles.find(
      (c) => c.qrCode.toLowerCase() === qrPayload.toLowerCase() || c.code.toLowerCase() === qrPayload.toLowerCase()
    );

    if (!cycle) {
      alert(`Cycle with QR payload '${qrPayload}' not found.`);
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

  const handleSubmitEndTrip = () => {
    onEndTrip(photoCaptured);
    setShowEndModal(false);
    setPhotoCaptured(false);
  };

  const { nearestHub, distanceMeters } = selectedCycle
    ? findNearestHub(userLocation.lat, userLocation.lng, hubs)
    : { nearestHub: null, distanceMeters: 0 };

  const withinGeofence = distanceMeters <= (nearestHub?.radius_meters || 60);

  return (
    <div className="space-y-4">
      {/* Active Ride Banner */}
      {activeTrip && (
        <div className="glass-card p-4 border-emerald-500/40 bg-emerald-950/20">
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

      {/* Student Trust Score Card */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-slate-400 font-medium">Student Trust Score</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-blue-400">{currentUser?.trustScore.toFixed(1) || '100.0'}</span>
              <span className="text-xs text-slate-400">/ 100</span>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              @iimbg.ac.in Verified
            </span>
          </div>
        </div>
        <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, currentUser?.trustScore || 100))}%` }}
          />
        </div>
      </div>

      {/* Interactive Campus Hubs Map */}
      <div className="glass-card p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-blue-400" />
            <span>Campus Hubs Map</span>
          </h2>
          <span className="text-xs text-slate-400">10 Hubs • 200 Fleet</span>
        </div>
        <CampusMap hubs={hubs} cycles={cycles} height="h-56" />
      </div>

      {/* Unlock & QR Scanner Card */}
      <div className="glass-card p-4 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30 mb-3">
          <QrCode className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">Ready to Ride?</h3>
        <p className="text-xs text-slate-400 mb-4">Scan QR code or select any of the 200 campus cycles below.</p>

        <div className="space-y-3">
          <button
            onClick={() => setShowQRModal(true)}
            className="w-full btn-primary text-sm py-3 flex items-center justify-center gap-2"
          >
            <Camera className="w-4 h-4" />
            <span>Scan Cycle QR Code</span>
          </button>

          {/* Quick Cycle Dropdown for instant selection */}
          <div className="text-left pt-1">
            <label className="text-xs text-slate-400 font-semibold block mb-1">Quick Select Cycle (200 Fleet):</label>
            <select
              onChange={(e) => e.target.value && handleScanCode(e.target.value)}
              className="w-full glass-input text-xs"
              defaultValue=""
            >
              <option value="" disabled>-- Select Cycle QR Code --</option>
              {cycles.filter((c) => c.status === 'available').slice(0, 50).map((c) => {
                const h = hubs.find((h) => h.id === c.hubId);
                return (
                  <option key={c.id} value={c.qrCode}>
                    {c.code} • {h?.name || 'Campus'} ({c.batteryPct}% Battery)
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* QR Scanner Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <QrCode className="w-4 h-4 text-blue-400" />
                <span>Web Camera QR Scanner</span>
              </h3>
              <button onClick={() => setShowQRModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative w-full h-48 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex flex-col items-center justify-center text-center p-3">
              <div className="w-32 h-32 border-2 border-dashed border-blue-400 rounded-xl flex items-center justify-center animate-pulse">
                <Focus className="w-12 h-12 text-blue-400/70" />
              </div>
              <p className="text-xs text-slate-400 mt-2">Align QR Code inside frame</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400 block font-medium">Or enter QR code payload manually:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. IIMBG-RIDE-001"
                  value={manualQRInput}
                  onChange={(e) => setManualQRInput(e.target.value)}
                  className="w-full glass-input text-xs"
                />
                <button
                  onClick={() => manualQRInput && handleScanCode(manualQRInput)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold text-white"
                >
                  Scan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dual Lock Modal */}
      {showLockModal && selectedCycle && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-400" />
                <span>Dual Lock Unlock Engine</span>
              </h3>
              <button onClick={() => setShowLockModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
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

      {/* End Trip Modal */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-400" />
                <span>AI Parking Photo Verification</span>
              </h3>
              <button onClick={() => setShowEndModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-300">Take a photo of your parked cycle showing the locked smart lock within the hub boundary.</p>

              <div className="w-full h-44 bg-slate-950 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center p-2">
                {photoCaptured ? (
                  <div className="text-emerald-400 flex flex-col items-center gap-1">
                    <CheckCircle className="w-8 h-8" />
                    <span className="text-xs font-bold">Lock & Parking Photo Captured</span>
                    <span className="text-[10px] text-slate-400">YOLO/ONNX Confidence: 96.5%</span>
                  </div>
                ) : (
                  <div className="text-slate-500 flex flex-col items-center gap-1">
                    <Aperture className="w-8 h-8 text-slate-600" />
                    <span className="text-xs">No Snapshot Captured</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => setPhotoCaptured(true)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 flex items-center justify-center gap-1.5"
              >
                <Aperture className="w-4 h-4 text-emerald-400" />
                <span>Capture Hub Parking Snapshot</span>
              </button>

              <button onClick={handleSubmitEndTrip} className="w-full btn-success text-sm py-2.5">
                Submit & End Ride
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
