import React, { useState } from 'react';
import { Bike, Shield, LogIn, LayoutDashboard, Smartphone, Lock } from 'lucide-react';

export default function Navbar({ currentUser, activeTab, setActiveTab, onOpenAuth }) {
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
      <nav className="glass-card p-4 rounded-3xl flex items-center justify-between border border-blue-500/20 bg-slate-900/90 shadow-xl mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-600/30 flex items-center justify-center text-blue-400 border border-blue-500/30 shadow">
            <Bike className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white leading-tight tracking-tight">CampusRide</h1>
            <p className="text-xs text-blue-400 font-medium">IIM Bodh Gaya</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => handleTabClick('student')}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1 transition ${
                activeTab === 'student' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>PWA</span>
            </button>
            <button
              onClick={() => handleTabClick('admin')}
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1 transition ${
                activeTab === 'admin' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>

          {currentUser ? (
            <button
              onClick={onOpenAuth}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl text-xs font-bold border border-white/10 transition flex items-center gap-1"
            >
              {currentUser.role === 'admin' && <Shield className="w-3.5 h-3.5 text-purple-400" />}
              <span>{currentUser.name.split(' ')[0]}</span>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold border border-blue-500/30 flex items-center gap-1.5 transition shadow"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>
          )}
        </div>
      </nav>

      {/* Admin Passcode Modal */}
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
