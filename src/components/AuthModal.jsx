import React, { useState } from 'react';
import { ShieldCheck, Zap, X } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onLogin }) {
  const [email, setEmail] = useState('aarav.s2025@iimbg.ac.in');
  const [name, setName] = useState('Aarav Sharma');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.includes('@iimbg.ac.in')) {
      alert('Access Restricted: Only @iimbg.ac.in email accounts are permitted.');
      return;
    }
    onLogin({ email, name, role: email.startsWith('admin@') ? 'admin' : 'student', trustScore: 98.5 });
    onClose();
  };

  const handleBypass = (role) => {
    const targetEmail = role === 'admin' ? 'admin@iimbg.ac.in' : 'aarav.s2025@iimbg.ac.in';
    const targetName = role === 'admin' ? 'Campus Fleet Admin' : 'Aarav Sharma';
    onLogin({ email: targetEmail, name: targetName, role, trustScore: 100.0 });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-sm p-5 space-y-4 border-blue-500/30">
        <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <span>Campus SSO Login</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-xs text-slate-300">Enter your IIM Bodh Gaya email to simulate Google SSO domain enforcement.</p>
          <div>
            <label className="text-xs text-slate-400 font-semibold block mb-1">Student Email (@iimbg.ac.in)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student.name2025@iimbg.ac.in"
              className="w-full glass-input text-sm"
              required
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-semibold block mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Aarav Sharma"
              className="w-full glass-input text-sm"
              required
            />
          </div>
          <button type="submit" className="w-full btn-primary text-sm py-2.5">
            Login with Google SSO
          </button>
        </form>

        <div className="relative py-2 text-center">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider bg-slate-900 px-2 font-bold">
            Local Dev Testing
          </span>
          <div className="absolute inset-0 flex items-center -z-10">
            <div className="w-full border-t border-slate-700"></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleBypass('student')}
            className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition border border-slate-700 flex items-center justify-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Student Bypass</span>
          </button>
          <button
            onClick={() => handleBypass('admin')}
            className="py-2 bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 rounded-lg text-xs font-semibold transition border border-purple-800 flex items-center justify-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span>Admin Bypass</span>
          </button>
        </div>
      </div>
    </div>
  );
}
