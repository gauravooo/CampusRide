import React, { useState } from 'react';
import { Bike, Shield, LogIn, LayoutDashboard, Smartphone, Lock, Sparkles, Navigation, ListFilter } from 'lucide-react';

export default function Navbar({ currentUser, activeTab, setActiveTab, onOpenAuth, onOpenFleetModal }) {
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const handleTabClick = (tab) => {
    if (tab === 'admin') {
      if (currentUser?.role === 'admin') {
        setActiveTab('admin');
      } else {
        setAdminPinInput('');
        setPinError('');
        setShowAdminPinModal(true);
      }
    } else {
      setActiveTab('student');
    }
  };

  const handleAdminPinSubmit = (e) => {
    e.preventDefault();
    if (adminPinInput === '8888' || adminPinInput === 'admin2026') {
      setShowAdminPinModal(false);
      setActiveTab('admin');
    } else {
      setPinError('Invalid Admin Passcode. (Default Admin PIN is 8888)');
    }
  };

  return (
    <>
      <nav className="fixed top-3 left-3 right-3 z-40 max-w-7xl mx-auto glass-panel px-4 py-2.5 flex items-center justify-between rounded-full shadow-2xl">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white border border-blue-400/40 shadow-lg shadow-blue-600/30">
            <Bike className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-white leading-tight flex items-center gap-1.5">
              <span>CampusRide</span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">PWA</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
              <Navigation className="w-3 h-3 text-emerald-400" /> IIM Bodh Gaya
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Fleet Catalog Modal Trigger */}
          <button
            onClick={onOpenFleetModal}
            className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-full text-xs font-bold border border-white/10 flex items-center gap-1.5 transition active:scale-95"
          >
            <ListFilter className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Fleet</span>
          </button>

          {/* Mode Switcher */}
          <div className="flex bg-slate-950 p-1 rounded-full border border-white/10 text-xs font-bold">
            <button
              onClick={() => handleTabClick('student')}
              className={`px-3 py-1 rounded-full flex items-center gap-1 transition ${
                activeTab === 'student' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Rider</span>
            </button>
            <button
              onClick={() => handleTabClick('admin')}
              className={`px-3 py-1 rounded-full flex items-center gap-1 transition ${
                activeTab === 'admin' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>

          {/* User Profile / Auth Toggle */}
          {currentUser ? (
            <button
              onClick={onOpenAuth}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full text-xs font-bold border border-white/10 transition flex items-center gap-1.5"
            >
              {currentUser.role === 'admin' && <Shield className="w-3.5 h-3.5 text-purple-400" />}
              <span>{currentUser.name.split(' ')[0]}</span>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3 py-1.5 bg-blue-600/30 text-blue-400 hover:bg-blue-600/50 rounded-full text-xs font-bold border border-blue-500/30 flex items-center gap-1.5 transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>
          )}
        </div>
      </nav>

      {/* Admin Passcode Protection Modal */}
      {showAdminPinModal && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm p-5 space-y-4 border-purple-500/40 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-purple-400" />
                <span>Admin Restricted Access</span>
              </h3>
              <button onClick={() => setShowAdminPinModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleAdminPinSubmit} className="space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                Enter the 4-digit Admin Passcode to open the Fleet Command Portal.
              </p>

              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">Admin Passcode / PIN:</label>
                <input
                  type="password"
                  placeholder="Default PIN: 8888"
                  value={adminPinInput}
                  onChange={(e) => setAdminPinInput(e.target.value)}
                  className="w-full glass-input text-center text-xl tracking-widest font-mono rounded-xl py-2.5"
                  maxLength={10}
                  autoFocus
                />
                {pinError && <p className="text-[11px] text-amber-400 mt-1 font-semibold">{pinError}</p>}
              </div>

              <button type="submit" className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-extrabold rounded-xl text-xs transition shadow-lg shadow-purple-600/30">
                Unlock Admin Portal
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
