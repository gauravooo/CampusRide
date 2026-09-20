import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bike, Shield, LogIn, LayoutDashboard, Smartphone } from 'lucide-react';

export default function Navbar({ currentUser, onOpenAuth }) {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <nav className="glass-card p-3.5 rounded-3xl flex items-center justify-between border border-blue-500/20 bg-slate-900/90 shadow-xl mb-4">
      {/* Brand Logo & IIMBG Tag */}
      <Link to="/" className="flex items-center space-x-3 group">
        <div className="w-10 h-10 rounded-2xl bg-blue-600/30 group-hover:bg-blue-600/40 flex items-center justify-center text-blue-400 border border-blue-500/30 shadow transition">
          <Bike className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-sm font-black text-white leading-tight tracking-tight flex items-center gap-1.5">
            <span>CampusRide</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 font-mono">
              PWA
            </span>
          </h1>
          <p className="text-[11px] text-blue-400 font-medium">IIM Bodh Gaya</p>
        </div>
      </Link>

      <div className="flex items-center space-x-2">
        {/* Navigation Route Tabs */}
        <div className="flex bg-slate-950 p-1 rounded-2xl border border-white/10 text-xs font-bold">
          <Link
            to="/"
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
              !isAdminRoute
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rider</span>
          </Link>

          <Link
            to="/admin"
            className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition ${
              isAdminRoute
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Admin</span>
          </Link>
        </div>

        {/* User Account / Login Button */}
        {currentUser ? (
          <button
            onClick={onOpenAuth}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl text-xs font-bold border border-white/10 transition flex items-center gap-1.5"
            title="Switch User / SSO Profile"
          >
            {currentUser.role === 'admin' ? (
              <Shield className="w-3.5 h-3.5 text-purple-400" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
            <span className="max-w-[80px] truncate">{currentUser.name.split(' ')[0]}</span>
          </button>
        ) : (
          <button
            onClick={onOpenAuth}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold border border-blue-500/30 flex items-center gap-1.5 transition shadow"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>SSO Login</span>
          </button>
        )}
      </div>
    </nav>
  );
}
