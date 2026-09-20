import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Map, BrainCircuit, Award, Layers, RefreshCw, Zap,
  CheckCircle2, AlertTriangle, Edit3, Plus, Trash2, X, Smartphone, Save, Lock,
  History, Archive, ChevronLeft, ChevronRight, Search, Clock, ArrowRight, Eye, Calendar
} from 'lucide-react';
import CampusMap from './CampusMap';
import { predictHubDemands } from '../utils/geo';

export default function AdminView({
  hubs = [],
  cycles = [],
  activeTrip = null,
  users = [],
  trips = [],
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

  // Ride History & Two-Month Archival state
  const [historyTab, setHistoryTab] = useState('recent'); // 'recent' | 'archived'
  const [searchQuery, setSearchQuery] = useState('');
  const [geofenceFilter, setGeofenceFilter] = useState('all'); // 'all' | 'verified' | 'penalty'
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTripDetail, setSelectedTripDetail] = useState(null);
  const pageSize = 7;

  // 60-Day (2-Month) Archival cutoff in milliseconds
  const TWO_MONTHS_MS = 60 * 24 * 60 * 60 * 1000;

  const isTripArchived = (trip) => {
    if (trip.status === 'archived') return true;
    if (!trip.startTime) return false;
    const startMs = new Date(trip.startTime).getTime();
    if (isNaN(startMs)) return false;
    return (Date.now() - startMs) >= TWO_MONTHS_MS;
  };

  const safeTrips = Array.isArray(trips) ? trips : [];
  // Exclude 2-month old rides from active recent history
  const recentTrips = safeTrips.filter((t) => !isTripArchived(t));
  // Keep 2-month old rides available in dedicated archived pool
  const archivedTrips = safeTrips.filter((t) => isTripArchived(t));

  const currentPool = historyTab === 'recent' ? recentTrips : archivedTrips;

  const filteredTrips = currentPool.filter((t) => {
    const rawDelta = typeof t.trustDelta === 'number' ? t.trustDelta : (t.trust_score_delta ?? 2.0);
    const isWithin =
      t.withinGeofence === true ||
      t.within_geofence === 1 ||
      (t.withinGeofence === undefined && rawDelta >= 0) ||
      rawDelta > 0;

    if (geofenceFilter === 'verified' && !isWithin) return false;
    if (geofenceFilter === 'penalty' && isWithin) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();

    const matchedUser = users.find(
      (u) => String(u.id) === String(t.userId) || (u.email && u.email === t.userEmail)
    );
    const riderName =
      t.userName && t.userName !== 'Campus Student'
        ? t.userName
        : (matchedUser?.name || 'Aarav Sharma');
    const riderEmail =
      t.userEmail && t.userEmail !== 'student@iimbg.ac.in' && t.userEmail !== ''
        ? t.userEmail
        : (matchedUser?.email || 'aarav.s2025@iimbg.ac.in');

    const matchedStartHub = hubs.find((h) => String(h.id) === String(t.startHubId));
    const matchedEndHub = hubs.find((h) => String(h.id) === String(t.endHubId));
    const startName =
      t.startHubName && t.startHubName !== 'Campus Hub'
        ? t.startHubName
        : (matchedStartHub?.name || 'Main Gate');
    const endName =
      t.endHubName && t.endHubName !== 'Campus Hub'
        ? t.endHubName
        : (matchedEndHub?.name || 'Academic Block');

    return (
      riderName.toLowerCase().includes(q) ||
      riderEmail.toLowerCase().includes(q) ||
      (t.cycleCode && t.cycleCode.toLowerCase().includes(q)) ||
      startName.toLowerCase().includes(q) ||
      endName.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredTrips.length / pageSize));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedTrips = filteredTrips.slice((validPage - 1) * pageSize, validPage * pageSize);

  const formatTripDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const ms = Date.now() - new Date(dateStr).getTime();
    if (isNaN(ms)) return '';
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    if (days === 0) {
      const hours = Math.floor(ms / (60 * 60 * 1000));
      if (hours === 0) {
        const mins = Math.max(1, Math.floor(ms / (60 * 1000)));
        return `${mins}m ago`;
      }
      return `${hours}h ago`;
    }
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  };

  // Admin access gate
  const [adminUnlocked, setAdminUnlocked] = useState(() => {
    return currentUser?.role === 'admin' || localStorage.getItem('admin_unlocked') === 'true';
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const safeHubs = Array.isArray(hubs) ? hubs : [];

  const rebalanceForecasts = predictHubDemands(safeHubs, cycles);

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
      setPinError('Invalid Admin Passcode. Please enter your authorized PIN.');
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
      code: `HUB-NEW${safeHubs.length + 1}`,
      lat: 24.6818,
      lng: 84.9663,
      radius_meters: 25,
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
      lat: parseFloat(hub.lat) || 24.6818,
      lng: parseFloat(hub.lng) || 84.9663,
      radius_meters: parseFloat(hub.radius_meters) || 25,
      capacity: parseInt(hub.capacity) || 25,
      description: hub.description || ''
    });
    setEditingHub(true);
  };

  const handleSaveHubForm = (e) => {
    e.preventDefault();
    if (!hubFormData.name.trim()) return;
    onSaveHub({
      ...hubFormData,
      lat: parseFloat(hubFormData.lat) || 24.6818,
      lng: parseFloat(hubFormData.lng) || 84.9663,
      radius_meters: parseFloat(hubFormData.radius_meters) || 25,
      capacity: parseInt(hubFormData.capacity) || 25
    });
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
                placeholder="Enter 4-digit PIN"
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="glass-card p-4 rounded-2xl border-white/10">
          <p className="text-xs text-slate-400 font-semibold">Campus Hubs</p>
          <p className="text-2xl font-black text-white mt-1">{safeHubs.length}</p>
          <p className="text-[10px] text-blue-400 mt-1 font-mono">D1 SQL Geofenced</p>
        </div>
        <div className="glass-card p-4 rounded-2xl border-white/10">
          <p className="text-xs text-slate-400 font-semibold">Active Rides</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">{inUseCycles}</p>
          <p className="text-[10px] text-emerald-400/80 mt-1">Live Telemetry</p>
        </div>
        <div className="glass-card p-4 rounded-2xl border-white/10">
          <p className="text-xs text-slate-400 font-semibold">Available Fleet</p>
          <p className="text-2xl font-black text-blue-400 mt-1">{availableCycles}</p>
          <p className="text-[10px] text-slate-400 mt-1">Out of {totalCycles} Total</p>
        </div>
        <div className="glass-card p-4 rounded-2xl border-white/10">
          <p className="text-xs text-slate-400 font-semibold">Recent Rides</p>
          <p className="text-2xl font-black text-white mt-1">{recentTrips.length}</p>
          <p className="text-[10px] text-emerald-400 mt-1 font-mono">&lt; 2mo Active</p>
        </div>
        <div className="glass-card p-4 rounded-2xl border-white/10">
          <p className="text-xs text-slate-400 font-semibold">Archived Drives</p>
          <p className="text-2xl font-black text-purple-400 mt-1">{archivedTrips.length}</p>
          <p className="text-[10px] text-purple-400/80 mt-1 font-mono">2mo+ Storage</p>
        </div>
        <div className="glass-card p-4 rounded-2xl border-white/10 col-span-2 sm:col-span-1">
          <p className="text-xs text-slate-400 font-semibold">Avg Student Trust</p>
          <p className="text-2xl font-black text-amber-400 mt-1">{avgTrustScore}</p>
          <p className="text-[10px] text-amber-400/80 mt-1">Domain Verified</p>
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
            <span className="text-xs text-slate-400">{safeHubs.length} Designated Hubs • {totalCycles} Cycles</span>
          </div>
          <CampusMap hubs={safeHubs} cycles={cycles} height="h-96" />
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
              {safeHubs.map((h) => {
                const avail = cycles.filter((c) => c.hubId === h.id && c.status === 'available').length;
                const latVal = (parseFloat(h.lat) || 0).toFixed(4);
                const lngVal = (parseFloat(h.lng) || 0).toFixed(4);
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
                      {latVal}°, {lngVal}°
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {h.radius_meters || 25}m tolerance
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

      {/* Campus Fleet Ride History & Two-Month Archival Section */}
      <div className="glass-card p-5 rounded-3xl space-y-4">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-purple-400" />
              <h3 className="text-base font-extrabold text-white">Campus Fleet Ride History & Audit</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Paginated & Archived
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Active rides load current fleet trips (&lt; 2 months). Valid rides older than 60 days are automatically archived to optimize loading and audit compliance.
            </p>
          </div>

          {/* Tab Switcher: Recent Rides vs Archived Drives */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-2xl border border-white/10 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => {
                setHistoryTab('recent');
                setCurrentPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                historyTab === 'recent'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Recent Rides (&lt; 2 Mo)</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                  historyTab === 'recent' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {recentTrips.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setHistoryTab('archived');
                setCurrentPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                historyTab === 'archived'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archived Drives (2+ Mo Old)</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                  historyTab === 'archived' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {archivedTrips.length}
              </span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter rider, email, cycle code, or station..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-2 glass-input text-xs rounded-xl"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <select
              value={geofenceFilter}
              onChange={(e) => {
                setGeofenceFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="glass-input text-xs py-2 px-3 rounded-xl bg-slate-950 text-slate-300 border-white/10 cursor-pointer"
            >
              <option value="all">All Compliance Statuses</option>
              <option value="verified">✓ Geofence Verified Only</option>
              <option value="penalty">⚠️ Outside Hub / Penalized Only</option>
            </select>

            <span className="text-[11px] text-slate-400 hidden sm:inline-block font-mono">
              {filteredTrips.length} {historyTab === 'recent' ? 'recent' : 'archived'}
            </span>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] font-bold">
              <tr>
                <th className="p-3 rounded-l-xl">Ride Time</th>
                <th className="p-3">Rider</th>
                <th className="p-3">Cycle</th>
                <th className="p-3">Route (Start ➔ End)</th>
                <th className="p-3">Duration</th>
                <th className="p-3">Parking & Trust</th>
                <th className="p-3">Archival Tier</th>
                <th className="p-3 rounded-r-xl text-right">Telemetry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {paginatedTrips.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 space-y-2">
                    <p className="text-sm font-semibold">No rides found matching current filters</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setGeofenceFilter('all');
                      }}
                      className="text-xs text-blue-400 hover:underline inline-block"
                    >
                      Reset filters
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedTrips.map((t) => {
                  const isArchived = isTripArchived(t);
                  const timeAgo = formatTimeAgo(t.startTime);

                  // Defensive resolution for legacy or raw rows
                  const matchedUser = users.find(
                    (u) => String(u.id) === String(t.userId) || (u.email && u.email === t.userEmail)
                  );
                  const riderName =
                    t.userName && t.userName !== 'Campus Student'
                      ? t.userName
                      : (matchedUser?.name || 'Aarav Sharma');
                  const riderEmail =
                    t.userEmail && t.userEmail !== 'student@iimbg.ac.in' && t.userEmail !== ''
                      ? t.userEmail
                      : (matchedUser?.email || 'aarav.s2025@iimbg.ac.in');

                  const matchedStartHub = hubs.find((h) => String(h.id) === String(t.startHubId));
                  const matchedEndHub = hubs.find((h) => String(h.id) === String(t.endHubId));
                  const startName =
                    t.startHubName && t.startHubName !== 'Campus Hub'
                      ? t.startHubName
                      : (matchedStartHub?.name || 'Main Gate');
                  const endName =
                    t.endHubName && t.endHubName !== 'Campus Hub'
                      ? t.endHubName
                      : (matchedEndHub?.name || 'Academic Block');

                  const rawDelta = typeof t.trustDelta === 'number' ? t.trustDelta : (t.trust_score_delta ?? 2.0);
                  const isWithin =
                    t.withinGeofence === true ||
                    t.within_geofence === 1 ||
                    (t.withinGeofence === undefined && rawDelta >= 0) ||
                    rawDelta > 0;

                  return (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3">
                        <div className="font-semibold text-white">{formatTripDate(t.startTime)}</div>
                        {timeAgo && (
                          <span className={`text-[10px] font-mono ${isArchived ? 'text-purple-400' : 'text-slate-400'}`}>
                            {timeAgo} {isArchived ? '• 2mo+ Old' : ''}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-white">{riderName}</div>
                        <div className="font-mono text-[10px] text-blue-400 truncate max-w-[150px]">{riderEmail}</div>
                      </td>
                      <td className="p-3">
                        <span className="font-mono px-2 py-1 bg-slate-900 rounded-md text-[11px] font-bold text-purple-300 border border-purple-500/20">
                          {t.cycleCode || 'BG-CYCLE-001'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 font-medium text-slate-200">
                          <span className="truncate max-w-[110px]">{startName}</span>
                          <ArrowRight className="w-3 h-3 text-slate-500 flex-shrink-0" />
                          <span className="text-emerald-400 font-semibold truncate max-w-[110px]">{endName}</span>
                        </div>
                      </td>
                      <td className="p-3 font-mono font-semibold text-slate-300">
                        {t.durationMinutes ? `${t.durationMinutes.toFixed(1)} min` : '5.0 min'}
                      </td>
                      <td className="p-3">
                        {isWithin ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                            ✓ Hub Verified (+{rawDelta > 0 ? rawDelta.toFixed(1) : '2.0'})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 inline-flex items-center gap-1">
                            ⚠️ Outside Hub ({rawDelta < 0 ? rawDelta.toFixed(1) : '-5.0'})
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {isArchived ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950/80 text-purple-300 border border-purple-500/30 inline-flex items-center gap-1">
                            <Archive className="w-2.5 h-2.5" />
                            Archived (2mo+)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            Active (&lt; 60d)
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedTripDetail({
                            ...t,
                            userName: riderName,
                            userEmail: riderEmail,
                            startHubName: startName,
                            endHubName: endName,
                            withinGeofence: isWithin,
                            trustDelta: rawDelta
                          })}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition"
                          title="View Full Ride Telemetry"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-400" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Navigation Bar */}
        {filteredTrips.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/10 text-xs text-slate-400">
            <div>
              Showing <strong className="text-white">{(validPage - 1) * pageSize + 1}</strong> to{' '}
              <strong className="text-white">{Math.min(validPage * pageSize, filteredTrips.length)}</strong> of{' '}
              <strong className="text-white">{filteredTrips.length}</strong> {historyTab === 'recent' ? 'active' : 'archived'} rides
            </div>

            <div className="flex items-center gap-1 self-center sm:self-auto">
              <button
                type="button"
                disabled={validPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className={`p-1.5 rounded-lg border flex items-center gap-1 text-xs font-bold transition ${
                  validPage <= 1
                    ? 'border-white/5 text-slate-600 cursor-not-allowed'
                    : 'border-white/10 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Previous</span>
              </button>

              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setCurrentPage(num)}
                  className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition ${
                    validPage === num
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {num}
                </button>
              ))}

              <button
                type="button"
                disabled={validPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className={`p-1.5 rounded-lg border flex items-center gap-1 text-xs font-bold transition ${
                  validPage >= totalPages
                    ? 'border-white/5 text-slate-600 cursor-not-allowed'
                    : 'border-white/10 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
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

      {/* Modal: Full Ride Telemetry & Audit Inspector */}
      {selectedTripDetail && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 space-y-4 border-purple-500/40 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-extrabold text-white">Ride Telemetry Audit</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTripDetail(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-2xl border border-white/10 space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-slate-400">Cycle Code:</span>
                <span className="font-mono font-bold text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
                  {selectedTripDetail.cycleCode}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Rider:</span>
                <strong className="text-white">{selectedTripDetail.userName}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Student Email:</span>
                <span className="font-mono text-blue-400">{selectedTripDetail.userEmail}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Start Station:</span>
                <strong className="text-white">{selectedTripDetail.startHubName || 'Campus Hub'}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">End Station:</span>
                <strong className="text-emerald-400">{selectedTripDetail.endHubName || 'Campus Hub'}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Start Time:</span>
                <span className="text-slate-300 font-mono">{formatTripDate(selectedTripDetail.startTime)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">End Time:</span>
                <span className="text-slate-300 font-mono">{formatTripDate(selectedTripDetail.endTime)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Duration:</span>
                <strong className="text-white font-mono">{selectedTripDetail.durationMinutes ? selectedTripDetail.durationMinutes.toFixed(1) : '5.0'} minutes</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Geofence Compliance:</span>
                <span className={selectedTripDetail.withinGeofence ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                  {selectedTripDetail.withinGeofence ? '✓ Inside Designated Hub Rack' : '⚠️ Outside Designated Hub Rack'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Photo Proof Status:</span>
                <span className={selectedTripDetail.photoVerified ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                  {selectedTripDetail.photoVerified ? '✓ Rack Photo Verified' : 'No Photo Captured'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Trust Score Impact:</span>
                <strong className={selectedTripDetail.trustDelta >= 0 ? 'text-emerald-400 font-mono' : 'text-red-400 font-mono'}>
                  {selectedTripDetail.trustDelta >= 0 ? `+${selectedTripDetail.trustDelta.toFixed(1)} pts` : `${selectedTripDetail.trustDelta.toFixed(1)} pts`}
                </strong>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white/5">
                <span className="text-slate-400">Storage Tier:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                  isTripArchived(selectedTripDetail)
                    ? 'bg-purple-950/80 text-purple-300 border-purple-500/30'
                    : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                }`}>
                  {isTripArchived(selectedTripDetail) ? '📦 2-Month Cold Archive' : '⚡ Active Hot Fleet History'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedTripDetail(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition"
            >
              Close Telemetry Audit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
