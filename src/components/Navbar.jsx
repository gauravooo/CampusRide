import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bike, Shield, LogIn, LayoutDashboard, Smartphone, LogOut, User, Award, ShieldCheck, ChevronDown } from 'lucide-react';

export default function Navbar({ currentUser, onOpenAuth, onLogout }) {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <nav className="glass-card p-3.5 rounded-3xl flex items-center justify-between border border-blue-500/20 bg-slate-900/90 shadow-xl mb-4 relative z-40">
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

        {/* User Account / Profile Button */}
        {currentUser ? (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl text-xs font-bold border border-white/10 transition flex items-center gap-1.5"
            >
              {currentUser.picture ? (
                <img src={currentUser.picture} alt="Avatar" className="w-4 h-4 rounded-full object-cover" />
              ) : currentUser.role === 'admin' ? (
                <Shield className="w-3.5 h-3.5 text-purple-400" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
              <span className="max-w-[75px] truncate">{currentUser.name.split(' ')[0]}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* User Profile Dropdown Popover */}
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 glass-card p-4 space-y-3 border-blue-500/30 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 z-50">
                <div className="flex items-center gap-2.5 pb-2 border-b border-white/10">
                  {currentUser.picture ? (
                    <img src={currentUser.picture} alt="Avatar" className="w-9 h-9 rounded-full object-cover border border-blue-400" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-blue-600/30 flex items-center justify-center text-blue-400 font-black border border-blue-500/30">
                      {currentUser.name.charAt(0)}
                    </div>
                  )}
                  <div className="truncate">
                    <strong className="text-xs font-bold text-white block truncate">{currentUser.name}</strong>
                    <span className="text-[10px] text-blue-400 font-mono block truncate">{currentUser.email}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs bg-slate-950/80 p-2.5 rounded-xl border border-white/5">
                  <span className="text-slate-400 font-semibold flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-400" /> Trust Score:
                  </span>
                  <strong className="text-emerald-400 font-black">
                    {currentUser.trustScore ? currentUser.trustScore.toFixed(1) : '100.0'}
                  </strong>
                </div>

                <div className="space-y-1 pt-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenAuth();
                    }}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <span>Switch Campus Account</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="w-full py-2 bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs font-semibold rounded-xl transition border border-red-500/30 flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-400" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
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
