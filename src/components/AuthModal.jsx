import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, X, AlertTriangle, Lock } from 'lucide-react';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '509461351344-5oi514h56p57nuj2vhlq426grv3ejjv4.apps.googleusercontent.com';

export default function AuthModal({ isOpen, onClose, onLogin }) {
  const [error, setError] = useState('');
  const googleBtnRef = useRef(null);

  // Initialize Google Identity Services
  useEffect(() => {
    if (!isOpen) return;

    if (window.google && window.google.accounts && GOOGLE_CLIENT_ID) {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true
        });

        if (googleBtnRef.current) {
          googleBtnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'filled_blue',
            size: 'large',
            shape: 'pill',
            text: 'continue_with',
            width: 320
          });
        }
      } catch (err) {
        console.warn('[GIS Init Error]', err);
      }
    }
  }, [isOpen]);

  const handleGoogleCredentialResponse = (response) => {
    setError('');
    try {
      // Decode JWT token payload
      const base64Url = response.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);

      // Strict Domain Check
      const userEmail = (payload.email || '').toLowerCase().trim();
      const isDomainValid = userEmail.endsWith('@iimbg.ac.in') || payload.hd === 'iimbg.ac.in';

      if (!isDomainValid) {
        setError(
          `Access Denied: ${userEmail} is not authorized. You must sign in with your official @iimbg.ac.in campus account.`
        );
        return;
      }

      const role = userEmail.startsWith('admin@') ? 'admin' : 'student';
      onLogin({
        id: Date.now(),
        email: userEmail,
        name: payload.name || userEmail.split('@')[0],
        picture: payload.picture || '',
        role,
        trustScore: 100.0,
        isDemo: false
      });
      onClose();
    } catch (e) {
      setError('Failed to process authentication response.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div
        id="campus-auth-modal"
        className="glass-card w-full max-w-sm p-6 space-y-4 border-blue-500/40 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/30 flex items-center justify-center text-blue-400 border border-blue-500/30 shadow-md shadow-blue-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white leading-tight">Campus Single Sign-On</h3>
              <p className="text-[10px] text-blue-400 font-mono font-semibold">Official @iimbg.ac.in Identity</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center border border-white/10 transition"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-2xl flex items-start gap-2 text-xs text-red-300">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span className="leading-tight">{error}</span>
          </div>
        )}

        {/* Main Authentication Card */}
        <div className="p-5 bg-slate-950/90 rounded-2xl border border-white/10 text-center space-y-4">
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-white flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-blue-400" />
              <span>CampusRide IIM Bodh Gaya</span>
            </h4>
            <p className="text-[11px] text-slate-300 leading-relaxed max-w-xs mx-auto">
              Please authenticate using your authorized institution account (<strong>@iimbg.ac.in</strong>).
            </p>
          </div>

          {/* Google Identity Services Render Target */}
          <div className="flex justify-center py-2 min-h-[44px]">
            <div ref={googleBtnRef} id="googleSignInDiv"></div>
          </div>

          <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/20 text-[10px] text-blue-300 space-y-1">
            <p className="font-semibold text-white">🔒 Enterprise Single Sign-On</p>
            <p className="text-slate-400">Strictly locked to IIM Bodh Gaya faculty, staff & students. Personal Gmail accounts are blocked.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
