import React, { useState } from 'react';
import { Bike, Shield, LogIn, LayoutDashboard, Smartphone, Lock } from 'lucide-react';

export default function Navbar({ currentUser, activeTab, setActiveTab, onOpenAuth }) {
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const handleTabClick = (tab) => {
    if (tab === 'admin') {
      // If user is already admin role, allow directly
      if (currentUser?.role === 'admin') {
        setActiveTab('admin');
      } else {
        // Prompt for Admin Security PIN
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
      setPinError('Invalid Admin PIN. (Default Admin PIN is 8888)');
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-50 glass-card mx-2 mt-2 px-4 py-3 flex items-center justify-between border-b border-slate-700/50">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 rounded-xl bg-blue-600/30 flex items-center justify-center text-blue-400 border border-blue-500/30">
            <Bike className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-tight">CampusRide</h1>
            <p className="text-xs text-blue-400 font-medium">IIM Bodh Gaya</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Navigation Tabs */}
          <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => handleTabClick('student')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'student' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>PWA</span>
            </button>
            <button
              onClick={() => handleTabClick('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'admin' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>

          {/* Auth status */}
          {currentUser ? (
            <button
              onClick={onOpenAuth}
              className="px-2.5 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-xl text-xs font-bold border border-blue-500/30 transition flex items-center gap-1"
            >
              {currentUser.role === 'admin' && <Shield className="w-3 h-3 text-purple-400" />}
              <span>{currentUser.name.split(' ')[0]}</span>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3 py-1.5 bg-blue-600/30 text-blue-400 hover:bg-blue-600/50 rounded-xl text-xs font-semibold border border-blue-500/30 flex items-center gap-1.5 transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>
          )}
        </div>
      </nav>

      {/* Admin PIN Passcode Protection Modal */}
      {showAdminPinModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-sm p-5 space-y-4 border-purple-500/40">
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-purple-400" />
                <span>Admin Restricted Access</span>
              </h3>
              <button onClick={() => setShowAdminPinModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleAdminPinSubmit} className="space-y-3">
              <p className="text-xs text-slate-300">
                Please enter the 4-digit Admin Passcode to access the Fleet Management Portal.
              </p>

              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Admin Passcode / PIN:</label>
                <input
                  type="password"
                  placeholder="Enter Admin PIN (Default: 8888)"
                  value={adminPinInput}
                  onChange={(e) => setAdminPinInput(e.target.value)}
                  className="w-full glass-input text-center text-lg tracking-widest font-mono"
                  maxLength={10}
                  autoFocus
                />
                {pinError && <p className="text-[11px] text-amber-400 mt-1 font-semibold">{pinError}</p>}
              </div>

              <button type="submit" className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-purple-600/30">
                Unlock Admin Portal
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
