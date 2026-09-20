import React from 'react';
import { Bike, Shield, LogIn, LayoutDashboard, Smartphone } from 'lucide-react';

export default function Navbar({ currentUser, activeTab, setActiveTab, onOpenAuth }) {
  return (
    <nav class="sticky top-0 z-50 glass-card mx-2 mt-2 px-4 py-3 flex items-center justify-between border-b border-slate-700/50">
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
            onClick={() => setActiveTab('student')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'student' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>PWA</span>
          </button>
          <button
            onClick={() => setActiveTab('admin')}
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
            className="px-2.5 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-xl text-xs font-bold border border-blue-500/30 transition"
          >
            {currentUser.name.split(' ')[0]}
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
  );
}
