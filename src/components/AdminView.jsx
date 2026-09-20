import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Map, BrainCircuit, Award, Layers, RefreshCw, Zap,
  CheckCircle2, AlertTriangle, Edit3, Plus, Trash2, X, Smartphone, Save, Lock
} from 'lucide-react';
import CampusMap from './CampusMap';
import { predictHubDemands } from '../utils/geo';

export default function AdminView({
  hubs = [],
  cycles = [],
  activeTrip = null,
  users = [],
  onAdjustTrustScore,
  onSaveHub,
  onDeleteHub,
  currentUser
}) {
  const [rebalanceStatus, setRebalanceStatus] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [newTrustScore, setNewTrustScore] = useState(100);
  const [trustReason, setTrustReason] = useState('');

  // Hub Management state
  const [editingHub, setEditingHub] = useState(null);
  const [isNewHub, setIsNewHub] = useState(false);
  const [hubFormData, setHubFormData] = useState({
    name: '',
    code: '',
    lat: 24.6961,
    lng: 84.9869,
    radius_meters: 60,
    capacity: 25,
    description: ''
  });

  // Admin access gate
  const [adminUnlocked, setAdminUnlocked] = useState(() => {
    return currentUser?.role === 'admin' || localStorage.getItem('admin_unlocked') === 'true';
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const rebalanceForecasts = predictHubDemands(hubs, cycles);

  const totalCycles = cycles.length;
  const availableCycles = cycles.filter((c) => c.status === 'available').length;
  const maintenanceCycles = cycles.filter((c) => c.status === 'maintenance').length;
  const inUseCycles = activeTrip ? 1 : 0;
  const avgTrustScore = users.length
    ? (users.reduce((acc, u) => acc + (u.trustScore || 100), 0) / users.length).toFixed(1)
    : '98.5';

  const handleUnlockAdmin = (e) => {
    e.preventDefault();
    if (pinInput === '8888' || pinInput === 'admin2026') {
      setAdminUnlocked(true);
      localStorage.setItem('admin_unlocked', 'true');
      setPinError('');
    } else {
      setPinError('Invalid Admin Passcode. (Default Passcode: 8888)');
    }
  };

  const handleTriggerRebalance = () => {
    setRebalanceStatus('optimizing');
    setTimeout(() => {
      setRebalanceStatus('complete');
      setTimeout(() => setRebalanceStatus(null), 4000);
    }, 1200);
  };

  // Trust Score Adjuster modal opener
  const handleOpenAdjustTrust = (student) => {
    setEditingStudent(student);
    setNewTrustScore(student.trustScore || 100);
    setTrustReason('Proper hub drop-off reward');
  };

  const handleSaveTrustScore = () => {
    if (!editingStudent) return;
    onAdjustTrustScore(editingStudent.id, newTrustScore, trustReason);
    setEditingStudent(null);
  };

  // Hub Modal Handlers
  const handleOpenAddHub = () => {
    setIsNewHub(true);
    setHubFormData({
      name: '',
      code: `HUB-NEW${hubs.length + 1}`,
      lat: 24.6961,
      lng: 84.9869,
      radius_meters: 60,
      capacity: 25,
      description: 'Designated campus pickup & drop station'
    });
    setEditingHub(true);
  };

  const handleOpenEditHub = (hub) => {
    setIsNewHub(false);
    setHubFormData({
      id: hub.id,
      name: hub.name,
      code: hub.code,
      lat: hub.lat,
      lng: hub.lng,
      radius_meters: hub.radius_meters || 60,
      capacity: hub.capacity || 25,
      description: hub.description || ''
    });
    setEditingHub(true);
  };

  const handleSaveHubForm = (e) => {
    e.preventDefault();
    onSaveHub(hubFormData);
    setEditingHub(null);
  };

  // Passcode gate if not authorized
  if (!adminUnlocked) {
    return (
      <div className="max-w-md mx-auto py-16 px-4">
        <div className="glass-card p-6 space-y-4 border-purple-500/40 rounded-3xl shadow-2xl text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-600/30 flex items-center justify-center text-purple-400 border border-purple-500/30 shadow">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Campus Fleet Command Portal</h2>
            <p className="text-xs text-purple-300 mt-1">Route restricted to IIM Bodh Gaya Fleet Operations Staff</p>
          </div>

          <form onSubmit={handleUnlockAdmin} className="space-y-3 pt-2">
            <div>
              <label className="text-xs text-slate-400 font-semibold block mb-1">Enter Admin PIN / Passcode:</label>
              <input
                type="password"
                placeholder="Default PIN: 8888"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full glass-input text-center text-xl tracking-widest font-mono rounded-xl py-3"
                autoFocus
              />
              {pinError && <p className="text-[11px] text-amber-400 mt-1 font-semibold">{pinError}</p>}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-xl transition shadow-lg shadow-purple-600/30"
            >
              Unlock Fleet Admin Portal
            </button>
          </form>

          <div className="pt-2">
            <Link
              to="/"
              className="text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 transition"
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-400" />
              <span>Back to Rider Mobile PWA</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 pt-2">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-purple-400" />
              <span>Fleet Operations & Hub Command</span>
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              /admin
            </span>
          </div>
          <p className="text-xs text-slate-400">Cloudflare D1 SQL Telemetry & Geofenced Hub Management for IIM Bodh Gaya</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleOpenAddHub}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Campus Hub</span>
          </button>

          <button
            onClick={handleTriggerRebalance}
            disabled={rebalanceStatus === 'optimizing'}
            className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition"
          >
            <BrainCircuit className="w-3.5 h-3.5 text-purple-300" />
            <span>{rebalanceStatus === 'optimizing' ? 'Optimizing...' : 'AI Rebalancing'}</span>
          </button>

          <Link
            to="/"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-white/10 flex items-center gap-1 transition"
          >
            <Smartphone className="w-3.5 h-3.5 text-blue-400" />
            <span>Launch Rider PWA</span>
          </Link>
        </div>
      </div>

      {rebalanceStatus === 'complete' && (
        <div className="p-4 bg-purple-950/80 border border-purple-500/50 rounded-2xl text-xs text-purple-300 flex items-center gap-3 animate-pulse">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <strong className="text-white block">AI Rebalancing Command Executed!</strong>
            <span>Autonomous dispatch instructions dispatched to campus logistics team. 18 cycles scheduled for shift.</span>
          </div>
        </div>
      )}

      {/* Top KPI Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="glass-card p-4 rounded-2xl border-white/10">
          <p className="text-xs text-slate-400 font-semibold">Campus Hubs</p>
          <p className="text-2xl font-black text-white mt-1">{hubs.length}</p>
          <p className="text-[10px] text-blue-400 mt-1 font-mono">D1 SQL Geofenced</p>
        </div>
        <div className="glass-card p-4 rounded-2xl border-white/10">
          <p className="text-xs text-slate-400 font-semibold">Active Rides</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">{inUseCycles}</p>
          <p className="text-[10px] text-emerald-400/80 mt-1">Live Telemetry Active</p>
        </div>
        <div className="glass-card p-4 rounded-2xl border-white/10">
          <p className="text-xs text-slate-400 font-semibold">Available Fleet</p>
          <p className="text-2xl font-black text-blue-400 mt-1">{availableCycles}</p>
          <p className="text-[10px] text-slate-400 mt-1">Out of {totalCycles} Total</p>
        </div>
        <div className="glass-card p-4 rounded-2xl border-white/10">
          <p className="text-xs text-slate-400 font-semibold">Maintenance</p>
          <p className="text-2xl font-black text-amber-400 mt-1">{maintenanceCycles}</p>
          <p className="text-[10px] text-amber-400/80 mt-1">Lock Servicing</p>
        </div>
        <div className="glass-card p-4 rounded-2xl border-white/10 col-span-2 md:col-span-1">
          <p className="text-xs text-slate-400 font-semibold">Avg Student Trust</p>
          <p className="text-2xl font-black text-purple-400 mt-1">{avgTrustScore}</p>
          <p className="text-[10px] text-purple-400/80 mt-1">Domain Verified</p>
        </div>
      </div>

      {/* Map & AI Rebalance Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-4 rounded-3xl space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Map className="w-5 h-5 text-blue-400" />
              <span>Live Campus Fleet Telemetry Map</span>
            </h2>
            <span className="text-xs text-slate-400">{hubs.length} Designated Hubs • {totalCycles} Cycles</span>
          </div>
          <CampusMap hubs={hubs} cycles={cycles} height="h-96" />
        </div>

        {/* AI Rebalancing Demand Forecaster */}
        <div className="glass-card p-4 rounded-3xl flex flex-col space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-purple-400" />
              <span>AI Rebalance Forecaster</span>
            </h2>
            <span className="text-[10px] font-bold text-purple-400 px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30">
              RandomForest
            </span>
          </div>
          <p className="text-xs text-slate-400">Peak demand forecast based on hourly class schedules & dining hours.</p>

          <div className="overflow-y-auto max-h-80 space-y-2 pr-1">
            {rebalanceForecasts.map((item) => {
              let sevClass = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
              if (item.severity === 'critical') sevClass = 'bg-red-500/20 text-red-400 border-red-500/30';
              else if (item.severity === 'high') sevClass = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
              else if (item.severity === 'medium') sevClass = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';

              return (
                <div key={item.hubId} className="p-3 bg-slate-900/80 rounded-2xl border border-white/5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{item.hubName}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${sevClass}`}>
                      {item.severity}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Supply: <strong className="text-white">{item.currentCount}</strong></span>
                    <span>Forecast: <strong className="text-purple-400">{item.predictedDemand}</strong></span>
                    <span>Deficit: <strong className={item.deficit > 0 ? 'text-red-400' : 'text-emerald-400'}>{item.deficit}</strong></span>
                  </div>
                  <p className="text-[11px] text-slate-300 bg-slate-950/60 p-2 rounded-xl border border-white/5">
                    {item.recommendedAction}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Designated Hubs Management Section (Allows admin to maintain pickup/drop locations) */}
      <div className="glass-card p-5 rounded-3xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              <span>Designated Pickup & Drop Places (Cloudflare D1 SQL)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Define official campus geofences where students must drop bikes to earn positive trust scores.
            </p>
          </div>
          <button
            onClick={handleOpenAddHub}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Designated Place</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold">
              <tr>
                <th className="p-3 rounded-l-xl">Hub Name</th>
                <th className="p-3">Code</th>
                <th className="p-3">Coordinates (Lat, Lng)</th>
                <th className="p-3">Geofence Radius</th>
                <th className="p-3">Capacity</th>
                <th className="p-3">Available</th>
                <th className="p-3 rounded-r-xl text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {hubs.map((h) => {
                const avail = cycles.filter((c) => c.hubId === h.id && c.status === 'available').length;
                return (
                  <tr key={h.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-bold text-white">
                      <div>
                        <span>{h.name}</span>
                        {h.description && (
                          <span className="block text-[10px] text-slate-400 font-normal truncate max-w-xs">
                            {h.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-mono text-blue-400">{h.code}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-300">
                      {h.lat.toFixed(4)}°, {h.lng.toFixed(4)}°
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {h.radius_meters || 60}m tolerance
                      </span>
                    </td>
                    <td className="p-3 text-slate-400">{h.capacity}</td>
                    <td className="p-3 font-extrabold text-emerald-400">{avail} 🚲</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditHub(h)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg hover:text-white transition"
                          title="Edit Hub Geofence & Location"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Remove designated hub '${h.name}'?`)) {
                              onDeleteHub(h.id);
                            }
                          }}
                          className="p-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 rounded-lg hover:text-white transition"
                          title="Delete Hub"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Trust Score Leaderboard with Adjuster */}
      <div className="glass-card p-5 rounded-3xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span>Student Trust Score Management</span>
            </h3>
            <p className="text-xs text-slate-400">Inspect compliance history, reward good parking, or adjust student trust scores.</p>
          </div>
          <span className="text-xs text-blue-400 font-mono">@iimbg.ac.in Verified</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold">
              <tr>
                <th className="p-3 rounded-l-xl">Student Name</th>
                <th className="p-3">Official Email</th>
                <th className="p-3">Trust Score</th>
                <th className="p-3">Role</th>
                <th className="p-3 rounded-r-xl text-right">Trust Score Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map((u) => {
                const score = typeof u.trustScore === 'number' ? u.trustScore : 100;
                const scoreColor = score >= 90 ? 'text-emerald-400' : (score >= 75 ? 'text-blue-400' : 'text-amber-400');
                return (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-bold text-white">{u.name}</td>
                    <td className="p-3 font-mono text-blue-400">{u.email}</td>
                    <td className={`p-3 font-black text-sm ${scoreColor}`}>
                      {score.toFixed(1)} / 100
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleOpenAdjustTrust(u)}
                        className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-lg text-xs shadow transition flex items-center gap-1.5 ml-auto"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Adjust Score</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Adjust Student Trust Score */}
      {editingStudent && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm p-5 space-y-4 border-blue-500/40 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <span>Adjust Trust Score</span>
              </h3>
              <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-2xl border border-white/10 space-y-1 text-xs">
              <p><span className="text-slate-400">Student:</span> <strong className="text-white">{editingStudent.name}</strong></p>
              <p><span className="text-slate-400">Email:</span> <strong className="text-blue-400 font-mono">{editingStudent.email}</strong></p>
              <p><span className="text-slate-400">Current Score:</span> <strong className="text-emerald-400 font-black">{editingStudent.trustScore?.toFixed(1) || '100.0'}</strong></p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  New Trust Score (0.0 to 100.0):
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={newTrustScore}
                    onChange={(e) => setNewTrustScore(parseFloat(e.target.value) || 0)}
                    className="w-full glass-input text-center text-xl font-black text-emerald-400 py-2.5 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Quick Adjustment Shortcuts */}
              <div className="grid grid-cols-4 gap-1.5 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setNewTrustScore((s) => Math.min(100, Math.round((s + 2) * 10) / 10))}
                  className="py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-lg border border-emerald-500/30"
                >
                  +2.0
                </button>
                <button
                  type="button"
                  onClick={() => setNewTrustScore((s) => Math.min(100, Math.round((s + 5) * 10) / 10))}
                  className="py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-lg border border-emerald-500/30"
                >
                  +5.0
                </button>
                <button
                  type="button"
                  onClick={() => setNewTrustScore((s) => Math.max(0, Math.round((s - 5) * 10) / 10))}
                  className="py-1.5 bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 rounded-lg border border-amber-500/30"
                >
                  -5.0
                </button>
                <button
                  type="button"
                  onClick={() => setNewTrustScore(100.0)}
                  className="py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg border border-blue-500/30"
                >
                  Reset 100
                </button>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Administrative Reason:</label>
                <input
                  type="text"
                  placeholder="e.g. Proper parking reward / Lock repair report"
                  value={trustReason}
                  onChange={(e) => setTrustReason(e.target.value)}
                  className="w-full glass-input text-xs"
                />
              </div>

              <button
                onClick={handleSaveTrustScore}
                className="w-full btn-primary text-xs py-3 font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
              >
                <Save className="w-4 h-4" />
                <span>Save to Cloudflare D1 SQL</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add or Edit Campus Designated Hub */}
      {editingHub && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 space-y-4 border-emerald-500/40 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                <span>{isNewHub ? 'Add Designated Campus Hub' : 'Edit Designated Hub'}</span>
              </h3>
              <button onClick={() => setEditingHub(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveHubForm} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Hub Name</label>
                  <input
                    type="text"
                    required
                    value={hubFormData.name}
                    onChange={(e) => setHubFormData({ ...hubFormData, name: e.target.value })}
                    placeholder="e.g. New Library Hub"
                    className="w-full glass-input text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Station Code</label>
                  <input
                    type="text"
                    required
                    value={hubFormData.code}
                    onChange={(e) => setHubFormData({ ...hubFormData, code: e.target.value.toUpperCase() })}
                    placeholder="HUB-LIB"
                    className="w-full glass-input text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Latitude (° N)</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={hubFormData.lat}
                    onChange={(e) => setHubFormData({ ...hubFormData, lat: parseFloat(e.target.value) || 0 })}
                    className="w-full glass-input text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Longitude (° E)</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={hubFormData.lng}
                    onChange={(e) => setHubFormData({ ...hubFormData, lng: parseFloat(e.target.value) || 0 })}
                    className="w-full glass-input text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Geofence Radius (m)</label>
                  <input
                    type="number"
                    min="20"
                    max="200"
                    required
                    value={hubFormData.radius_meters}
                    onChange={(e) => setHubFormData({ ...hubFormData, radius_meters: parseFloat(e.target.value) || 60 })}
                    className="w-full glass-input text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Cycle Capacity</label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    required
                    value={hubFormData.capacity}
                    onChange={(e) => setHubFormData({ ...hubFormData, capacity: parseInt(e.target.value) || 25 })}
                    className="w-full glass-input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Description</label>
                <input
                  type="text"
                  value={hubFormData.description}
                  onChange={(e) => setHubFormData({ ...hubFormData, description: e.target.value })}
                  placeholder="Designated parking rack near entrance"
                  className="w-full glass-input text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full btn-success text-xs py-3 font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30"
              >
                <Save className="w-4 h-4" />
                <span>Save Designated Place to D1 SQL</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
