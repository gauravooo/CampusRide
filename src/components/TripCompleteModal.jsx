import React from 'react';
import ReactDOM from 'react-dom';
import { CheckCircle2, ShieldCheck, AlertTriangle, Bike, Clock, Leaf, Flame, MapPin, X, ArrowRight } from 'lucide-react';

export default function TripCompleteModal({ isOpen, onClose, tripResult }) {
  if (!isOpen || !tripResult) return null;

  const {
    cycleCode = 'BG-CYCLE',
    durationSeconds = 0,
    co2Grams = 0,
    calories = 0,
    endHubName = 'Campus Hub',
    withinGeofence = true,
    photoVerified = true,
    trustDelta = 0.0,
    newTrustScore = 100.0,
    isDemoSimulated = false
  } = tripResult;

  const formatDuration = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="glass-card w-full max-w-sm p-6 space-y-4 border rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 bg-slate-900/95 border-emerald-500/40">
        {/* Header Icon & Title */}
        <div className="text-center space-y-2">
          <div className={`w-14 h-14 mx-auto rounded-3xl flex items-center justify-center shadow-xl ${
            withinGeofence
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-emerald-500/20'
              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-amber-500/20'
          }`}>
            {withinGeofence ? <CheckCircle2 className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
          </div>

          <div>
            <h3 className="text-lg font-black text-white">
              {withinGeofence ? 'Ride Completed!' : 'Ride Ended with Warning'}
            </h3>
            <p className="text-xs text-slate-400 flex items-center justify-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span>Dropped at: <strong className="text-slate-200">{endHubName}</strong></span>
            </p>
          </div>
        </div>

        {/* Demo Simulation Tag if applicable */}
        {isDemoSimulated && (
          <div className="py-1 px-2.5 rounded-xl bg-blue-950/60 border border-blue-500/30 text-center text-[10px] text-blue-300 font-mono">
            🧪 Demo Mode: Simulated Campus Hub Drop Verified
          </div>
        )}

        {/* Ride Performance Grid */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2.5 bg-slate-950/80 rounded-2xl border border-white/5 space-y-0.5">
            <span className="text-slate-400 text-[10px] flex items-center justify-center gap-1">
              <Clock className="w-3 h-3 text-sky-400" /> Time
            </span>
            <strong className="text-white text-sm font-mono block">
              {formatDuration(durationSeconds)}
            </strong>
          </div>

          <div className="p-2.5 bg-slate-950/80 rounded-2xl border border-white/5 space-y-0.5">
            <span className="text-slate-400 text-[10px] flex items-center justify-center gap-1">
              <Leaf className="w-3 h-3 text-emerald-400" /> CO2 Saved
            </span>
            <strong className="text-emerald-400 text-sm font-mono block">
              {co2Grams}g
            </strong>
          </div>

          <div className="p-2.5 bg-slate-950/80 rounded-2xl border border-white/5 space-y-0.5">
            <span className="text-slate-400 text-[10px] flex items-center justify-center gap-1">
              <Flame className="w-3 h-3 text-amber-400" /> Calories
            </span>
            <strong className="text-amber-400 text-sm font-mono block">
              {calories} kcal
            </strong>
          </div>
        </div>

        {/* Trust Score Adjustment Card */}
        <div className={`p-3.5 rounded-2xl border space-y-1.5 ${
          withinGeofence
            ? 'bg-emerald-950/40 border-emerald-500/30'
            : 'bg-amber-950/40 border-amber-500/30'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold flex items-center gap-1.5 text-white">
              <ShieldCheck className={`w-4 h-4 ${withinGeofence ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span>Trust Score Impact</span>
            </span>
            <span className={`font-mono font-extrabold px-2 py-0.5 rounded-lg text-xs ${
              trustDelta >= 0
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {trustDelta >= 0 ? `+${trustDelta.toFixed(1)}` : `${trustDelta.toFixed(1)}`} pts
            </span>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            {withinGeofence
              ? photoVerified
                ? 'Excellent drop-off! Cycle returned to designated rack zone with photo proof.'
                : 'Parked within station radius. Verified without camera snapshot.'
              : 'Cycle dropped outside designated station geofence. Please park in campus hubs to maintain elite standing.'}
          </p>

          <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-slate-400">Current Trust Rating:</span>
            <strong className="text-white font-mono text-sm">{newTrustScore.toFixed(1)} / 100</strong>
          </div>
        </div>

        {/* Cycle Relocation Status */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-950/60 rounded-xl border border-white/5 text-xs text-slate-300">
          <span className="flex items-center gap-1.5">
            <Bike className="w-3.5 h-3.5 text-blue-400" />
            <span>Cycle <strong className="text-white font-mono">{cycleCode}</strong></span>
          </span>
          <span className="text-[10px] text-emerald-400 font-bold font-mono">
            ● Available in Rack
          </span>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white text-xs font-extrabold rounded-2xl shadow-xl shadow-blue-600/30 transition active:scale-98 flex items-center justify-center gap-2"
        >
          <span>Done</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>,
    document.body
  );
}
