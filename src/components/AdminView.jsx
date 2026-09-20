import React from 'react';
import { Shield, Map, BrainCircuit, Award, Layers, RefreshCw } from 'lucide-react';
import CampusMap from './CampusMap';
import { predictHubDemands } from '../utils/geo';

export default function AdminView({ hubs, cycles, activeTrip, users }) {
  const rebalanceForecasts = predictHubDemands(hubs, cycles);

  const totalCycles = cycles.length;
  const availableCycles = cycles.filter((c) => c.status === 'available').length;
  const maintenanceCycles = cycles.filter((c) => c.status === 'maintenance').length;
  const inUseCycles = activeTrip ? 1 : 0;
  const avgTrustScore = users.length
    ? (users.reduce((acc, u) => acc + u.trustScore, 0) / users.length).toFixed(1)
    : '98.5';

  return (
    <div className="space-y-6">
      {/* Top KPI Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="glass-card p-4">
          <p className="text-xs text-slate-400 font-medium">Campus Hubs</p>
          <p className="text-2xl font-black text-white mt-1">10</p>
          <p className="text-[10px] text-blue-400 mt-1">Centered ~24.6961° N</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-400 font-medium">Active Rides</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">{inUseCycles}</p>
          <p className="text-[10px] text-emerald-400/80 mt-1">Live BLE Telemetry</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-400 font-medium">Available Fleet</p>
          <p className="text-2xl font-black text-blue-400 mt-1">{availableCycles}</p>
          <p className="text-[10px] text-slate-400 mt-1">Out of {totalCycles} Total</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-400 font-medium">Maintenance</p>
          <p className="text-2xl font-black text-amber-400 mt-1">{maintenanceCycles}</p>
          <p className="text-[10px] text-amber-400/80 mt-1">Lock Servicing</p>
        </div>
        <div className="glass-card p-4 col-span-2 md:col-span-1">
          <p className="text-xs text-slate-400 font-medium">Avg Student Trust</p>
          <p className="text-2xl font-black text-purple-400 mt-1">{avgTrustScore}</p>
          <p className="text-[10px] text-purple-400/80 mt-1">Geofence Compliance</p>
        </div>
      </div>

      {/* Map & AI Rebalancing Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fleet Telemetry Map */}
        <div className="lg:col-span-2 glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Map className="w-5 h-5 text-blue-400" />
              <span>Live Campus Fleet Telemetry Map</span>
            </h2>
            <span className="text-xs text-slate-400">10 Hubs • 200 Fleet</span>
          </div>
          <CampusMap hubs={hubs} cycles={cycles} height="h-96" />
        </div>

        {/* AI Rebalancing Demand Forecaster */}
        <div className="glass-card p-4 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-purple-400" />
              <span>AI Rebalancing Forecaster</span>
            </h2>
            <span className="text-[10px] font-bold text-purple-400 px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
              RandomForest
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-3">Predicts peak hub deficits based on hourly class schedules & dining hours.</p>

          <div className="overflow-y-auto max-h-80 space-y-2 pr-1">
            {rebalanceForecasts.map((item) => {
              let sevClass = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
              if (item.severity === 'critical') sevClass = 'bg-red-500/20 text-red-400 border-red-500/30';
              else if (item.severity === 'high') sevClass = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
              else if (item.severity === 'medium') sevClass = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';

              return (
                <div key={item.hubId} className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{item.hubName}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${sevClass}`}>
                      {item.severity}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Supply: <strong className="text-white">{item.currentCount}</strong></span>
                    <span>Forecast Demand: <strong className="text-purple-400">{item.predictedDemand}</strong></span>
                    <span>Deficit: <strong className={item.deficit > 0 ? 'text-red-400' : 'text-emerald-400'}>{item.deficit}</strong></span>
                  </div>
                  <p className="text-[11px] text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                    {item.recommendedAction}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Student Trust Scores & Hub Inventory Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Student Trust Score Leaderboard */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span>Student Trust Scores</span>
            </h2>
            <span className="text-xs text-slate-400">@iimbg.ac.in Verified</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead class="bg-slate-800/60 text-slate-400 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-2.5 rounded-l-lg">Student</th>
                  <th className="p-2.5">Email (@iimbg.ac.in)</th>
                  <th className="p-2.5">Trust Score</th>
                  <th className="p-2.5 rounded-r-lg">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-2.5 font-semibold text-white">{u.name}</td>
                    <td className="p-2.5 text-blue-400 font-mono">{u.email}</td>
                    <td className="p-2.5 font-black text-emerald-400">{u.trustScore.toFixed(1)}</td>
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                        {u.role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hub Capacity & Inventory */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              <span>Hub Capacity & Fleet Distribution</span>
            </h2>
            <span className="text-xs text-slate-400">10 Hubs</span>
          </div>
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 text-slate-400 uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-2.5 rounded-l-lg">Hub Name</th>
                  <th className="p-2.5">Code</th>
                  <th className="p-2.5">Available</th>
                  <th className="p-2.5">Capacity</th>
                  <th className="p-2.5 rounded-r-lg">Occupation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {hubs.map((h) => {
                  const avail = cycles.filter((c) => c.hubId === h.id && c.status === 'available').length;
                  const pct = Math.round((avail / h.capacity) * 100);
                  return (
                    <tr key={h.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-2.5 font-semibold text-white">{h.name}</td>
                      <td className="p-2.5 font-mono text-blue-400">{h.code}</td>
                      <td className="p-2.5 font-bold text-emerald-400">{avail}</td>
                      <td className="p-2.5 text-slate-400">{h.capacity}</td>
                      <td className="p-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-blue-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] text-slate-400">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
