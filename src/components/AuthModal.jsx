import React, { useState } from 'react';
import { ShieldCheck, Zap, X, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onLogin }) {
  const [email, setEmail] = useState('aarav.s2025@iimbg.ac.in');
  const [name, setName] = useState('Aarav Sharma');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim().toLowerCase();
    const parts = trimmedEmail.split('@');
    if (parts.length !== 2 || parts[1] !== 'iimbg.ac.in') {
      setError('Access Restricted: Only verified @iimbg.ac.in student/faculty accounts are authorized.');
      return;
    }

    const role = trimmedEmail.startsWith('admin@') ? 'admin' : 'student';
    onLogin({
      id: Date.now(),
      email: trimmedEmail,
      name: name.trim() || trimmedEmail.split('@')[0],
      role,
      trustScore: 100.0
    });
    onClose();
  };

  const handleBypass = (role) => {
    const targetEmail = role === 'admin' ? 'admin@iimbg.ac.in' : 'aarav.s2025@iimbg.ac.in';
    const targetName = role === 'admin' ? 'Campus Fleet Admin' : 'Aarav Sharma';
    onLogin({
      id: role === 'admin' ? 5 : 1,
      email: targetEmail,
      name: targetName,
      role,
      trustScore: role === 'admin' ? 100.0 : 98.5
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-sm p-6 space-y-4 border-blue-500/40 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600/30 flex items-center justify-center text-blue-400 border border-blue-500/30">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Campus SSO Sign-In</h3>
              <p className="text-[10px] text-blue-400 font-mono">@iimbg.ac.in Domain Guard</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center border border-white/10 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-2xl flex items-start gap-2 text-xs text-red-300">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-slate-300 font-semibold block mb-1">
              Official Campus Email <span className="text-blue-400">(@iimbg.ac.in)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              placeholder="name.year@iimbg.ac.in"
              className="w-full glass-input text-xs font-mono"
              required
            />
          </div>

          <div>
            <label className="text-xs text-slate-300 font-semibold block mb-1">Student / Faculty Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aarav Sharma"
              className="w-full glass-input text-xs"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full btn-primary text-xs py-3 flex items-center justify-center gap-2 font-extrabold rounded-2xl shadow-xl shadow-blue-600/30"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Verify & Enter CampusRide</span>
          </button>
        </form>

        <div className="relative py-1 text-center">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest bg-slate-900 px-2 font-bold">
            Demo SSO Quick Access
          </span>
          <div className="absolute inset-0 flex items-center -z-10">
            <div className="w-full border-t border-white/10"></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleBypass('student')}
            className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition border border-white/10 flex items-center justify-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Student Demo</span>
          </button>
          <button
            onClick={() => handleBypass('admin')}
            className="py-2.5 bg-purple-950/60 hover:bg-purple-900 text-purple-200 rounded-xl text-xs font-bold transition border border-purple-500/30 flex items-center justify-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span>Admin Demo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
