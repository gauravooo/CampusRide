import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, X, AlertTriangle, Lock } from 'lucide-react';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '509461351344-5oi514h56p57nuj2vhlq426grv3ejjv4.apps.googleusercontent.com';

export default function AuthModal({ isOpen, onClose, onLogin, onAdminLogin }) {
  const [error, setError] = useState('');
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [adminPinError, setAdminPinError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(true);
  const [googleFailed, setGoogleFailed] = useState(false);
  const googleBtnRef = useRef(null);

  // Reset local states on open
  useEffect(() => {
    if (isOpen) {
      setError('');
      setAdminPinError('');
      setAdminPin('');
      setShowAdminPin(false);
      setGoogleFailed(false);
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
      if (onClose) onClose();
    } catch (e) {
      setError('Failed to process authentication response.');
    }
  };

  // Initialize Google Identity Services with automatic polling & fast script execution
  useEffect(() => {
    if (!isOpen || showAdminPin) return;

    let isMounted = true;
    setGoogleLoading(true);
    setGoogleFailed(false);

    const renderButton = () => {
      if (!isMounted) return;
      try {
        if (!window.google?.accounts?.id) {
          console.warn('[GIS] google.accounts.id not found on render attempt');
          setGoogleFailed(true);
          setGoogleLoading(false);
          return;
        }

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
          setGoogleLoading(false);
          setGoogleFailed(false);
        }
      } catch (err) {
        console.warn('[GIS Init Error]', err);
        if (isMounted) {
          setGoogleFailed(true);
          setGoogleLoading(false);
        }
      }
    };

    if (window.google?.accounts?.id) {
      renderButton();
    } else {
      // If script is not yet present or still downloading
      let script = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        document.head.appendChild(script);
      }

      const onScriptLoad = () => {
        renderButton();
      };

      script.addEventListener('load', onScriptLoad);

      // Fast polling fallback to render as soon as script evaluates
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          renderButton();
        }
      }, 100);

      const timeout = setTimeout(() => {
        clearInterval(interval);
        if (isMounted && !window.google?.accounts?.id) {
          setGoogleFailed(true);
          setGoogleLoading(false);
        }
      }, 8000);

      return () => {
        isMounted = false;
        script.removeEventListener('load', onScriptLoad);
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, showAdminPin]);

  const handleAdminPinSubmit = (e) => {
    e.preventDefault();
    if (adminPin === '8888' || adminPin === 'admin2026') {
      setAdminPinError('');
      if (onAdminLogin) {
        onAdminLogin();
      }
    } else {
      setAdminPinError('Invalid Admin Passcode. Fleet staff only.');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
      className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
    >
      <div
        id="campus-auth-modal"
        onClick={(e) => e.stopPropagation()}
        className="glass-card w-full max-w-sm p-6 space-y-4 border-blue-500/40 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-md ${
              showAdminPin
                ? 'bg-purple-600/30 text-purple-400 border-purple-500/30 shadow-purple-500/20'
                : 'bg-blue-600/30 text-blue-400 border-blue-500/30 shadow-blue-500/20'
            }`}>
              {showAdminPin ? <Lock className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-black text-white leading-tight">
                {showAdminPin ? 'Fleet Operations Staff' : 'Campus Single Sign-On'}
              </h3>
              <p className={`text-[10px] font-mono font-semibold ${showAdminPin ? 'text-purple-400' : 'text-blue-400'}`}>
                {showAdminPin ? 'Secure Staff PIN Access' : 'Official @iimbg.ac.in Identity'}
              </p>
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

        {showAdminPin ? (
          /* Admin PIN Input Form */
          <div className="p-5 bg-slate-950/90 rounded-2xl border border-purple-500/30 text-center space-y-4">
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-white flex items-center justify-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-purple-400" />
                <span>Admin Passcode Verification</span>
              </h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Enter your authorized 4-digit fleet PIN to unlock command portal.
              </p>
            </div>

            <form onSubmit={handleAdminPinSubmit} className="space-y-3">
              <div>
                <input
                  type="password"
                  placeholder="Enter PIN"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  className="w-full glass-input text-center text-xl tracking-widest font-mono rounded-xl py-2.5 focus:border-purple-400"
                  autoFocus
                />
                {adminPinError && (
                  <p className="text-[11px] text-amber-400 mt-1 font-semibold">{adminPinError}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-xl transition shadow-lg shadow-purple-600/30"
              >
                Log In as Fleet Admin
              </button>
            </form>

            <div className="pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setShowAdminPin(false);
                  setAdminPinError('');
                }}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold transition"
              >
                ← Back to Student SSO
              </button>
            </div>
          </div>
        ) : (
          /* Main Authentication Card */
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

            {/* Google Identity Services Render Target with Loading & Retry */}
            <div className="flex flex-col items-center justify-center py-2 min-h-[44px]">
              {googleLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-400 py-2.5">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Connecting to Google Identity...</span>
                </div>
              )}

              {googleFailed && (
                <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-center space-y-2 w-full">
                  <p className="text-xs text-amber-300 font-semibold">Google SSO connection timed out.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setGoogleLoading(true);
                      setGoogleFailed(false);
                      const s = document.createElement('script');
                      s.src = `https://accounts.google.com/gsi/client?v=${Date.now()}`;
                      s.async = true;
                      s.onload = () => {
                        if (window.google?.accounts?.id && googleBtnRef.current) {
                          window.google.accounts.id.initialize({
                            client_id: GOOGLE_CLIENT_ID,
                            callback: handleGoogleCredentialResponse,
                            auto_select: false
                          });
                          googleBtnRef.current.innerHTML = '';
                          window.google.accounts.id.renderButton(googleBtnRef.current, {
                            theme: 'filled_blue',
                            size: 'large',
                            shape: 'pill',
                            text: 'continue_with',
                            width: 320
                          });
                          setGoogleLoading(false);
                          setGoogleFailed(false);
                        }
                      };
                      document.head.appendChild(s);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow"
                  >
                    Retry Google SSO
                  </button>
                </div>
              )}

              <div
                ref={googleBtnRef}
                id="googleSignInDiv"
                className={googleLoading || googleFailed ? 'hidden' : 'flex justify-center'}
              ></div>
            </div>

            <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/20 text-[10px] text-blue-300 space-y-1">
              <p className="font-semibold text-white">🔒 Enterprise Single Sign-On</p>
              <p className="text-slate-400">Strictly locked to IIM Bodh Gaya faculty, staff & students. Personal Gmail accounts are blocked.</p>
            </div>

            {onAdminLogin && (
              <div className="pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setShowAdminPin(true);
                  }}
                  className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center justify-center gap-1.5 mx-auto transition"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Fleet Operations Staff? Log In with PIN</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
