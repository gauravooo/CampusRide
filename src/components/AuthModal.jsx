import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Zap, X, AlertTriangle, CheckCircle2, Mail, KeyRound, Settings, ArrowRight, RefreshCw } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onLogin }) {
  const [activeMode, setActiveMode] = useState('google'); // 'google' | 'otp'
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otpStep, setOtpStep] = useState(1); // 1: enter email, 2: enter 6-digit OTP
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [googleClientId, setGoogleClientId] = useState(() => {
    return localStorage.getItem('campus_google_client_id') || import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  });

  const googleBtnRef = useRef(null);

  // Initialize Google Identity Services (Sign in with Google)
  useEffect(() => {
    if (!isOpen) return;

    if (window.google && window.google.accounts && googleClientId) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
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
            text: 'signin_with',
            width: 310
          });
        }
      } catch (err) {
        console.warn('[GIS Init Error]', err);
      }
    }
  }, [isOpen, googleClientId, activeMode]);

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
          `Access Denied: ${userEmail} is not authorized. You must sign in with your official @iimbg.ac.in student/faculty account.`
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
        trustScore: 100.0
      });
      onClose();
    } catch (e) {
      setError('Failed to process Google sign-in response.');
    }
  };

  // OTP Verification Flow
  const handleSendOtp = (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim().toLowerCase();
    const parts = trimmedEmail.split('@');
    if (parts.length !== 2 || parts[1] !== 'iimbg.ac.in') {
      setError('Access Restricted: Only verified @iimbg.ac.in student/faculty accounts are authorized.');
      return;
    }

    // Generate authentic 6-digit session code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setOtpStep(2);
    setSuccessMsg(`Verification code sent to ${trimmedEmail} (Code: ${code})`);
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    setError('');

    if (enteredOtp.trim() !== generatedOtp.trim()) {
      setError('Invalid 6-digit verification code. Please check and try again.');
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-sm p-6 space-y-4 border-blue-500/40 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-blue-600/30 flex items-center justify-center text-blue-400 border border-blue-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Campus SSO Login</h3>
              <p className="text-[10px] text-blue-400 font-mono">@iimbg.ac.in Domain Enforcement</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center border border-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection: Google SSO vs Email OTP */}
        <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-white/10 text-xs font-bold">
          <button
            onClick={() => {
              setActiveMode('google');
              setError('');
            }}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeMode === 'google' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Google SSO</span>
          </button>
          <button
            onClick={() => {
              setActiveMode('otp');
              setError('');
            }}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeMode === 'otp' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Campus Email OTP</span>
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-2xl flex items-start gap-2 text-xs text-red-300">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span className="leading-tight">{error}</span>
          </div>
        )}

        {/* Mode 1: Google Identity Services (Sign in with Google) */}
        {activeMode === 'google' && (
          <div className="space-y-3 text-center py-1">
            <p className="text-xs text-slate-300 leading-relaxed">
              Sign in with your official <strong>@iimbg.ac.in</strong> Google Workspace account. Personal @gmail.com accounts will be rejected.
            </p>

            {/* Google Render Container */}
            <div className="flex justify-center py-2 min-h-[44px]">
              <div ref={googleBtnRef} id="googleSignInDiv"></div>
            </div>

            {!googleClientId && (
              <div className="p-3 bg-slate-950/90 rounded-2xl border border-white/10 text-left space-y-2 text-xs text-slate-300">
                <p className="text-[11px] text-slate-400 leading-tight">
                  💡 Google OAuth requires a Client ID from Google Cloud Console. You can enter one below or use the <strong>Campus Email OTP</strong> tab for instant verification!
                </p>
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  className="text-[11px] text-blue-400 font-bold hover:underline flex items-center gap-1"
                >
                  <Settings className="w-3 h-3" />
                  <span>{showConfig ? 'Hide OAuth Settings' : 'Configure Google Client ID'}</span>
                </button>

                {showConfig && (
                  <div className="space-y-1.5 pt-1">
                    <input
                      type="text"
                      placeholder="e.g. 123456...apps.googleusercontent.com"
                      value={googleClientId}
                      onChange={(e) => setGoogleClientId(e.target.value)}
                      className="w-full glass-input text-[11px] font-mono py-1.5"
                    />
                    <button
                      onClick={() => {
                        localStorage.setItem('campus_google_client_id', googleClientId);
                        alert('Google Client ID saved! Refreshing sign-in...');
                      }}
                      className="w-full py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold"
                    >
                      Save Client ID
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Mode 2: Campus Email Verification (OTP) */}
        {activeMode === 'otp' && (
          <div className="space-y-3">
            {otpStep === 1 ? (
              <form onSubmit={handleSendOtp} className="space-y-3">
                <p className="text-xs text-slate-300">
                  Enter your official <strong>@iimbg.ac.in</strong> email to receive a login verification code.
                </p>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Campus Email <span className="text-blue-400">(@iimbg.ac.in)</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="student.name2025@iimbg.ac.in"
                      className="w-full glass-input text-xs pl-9 font-mono"
                      required
                      autoFocus
                    />
                  </div>
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
                  <span>Send 6-Digit Code</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-3 animate-in fade-in duration-200">
                {successMsg && (
                  <div className="p-2.5 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-[11px] text-emerald-300">
                    {successMsg}
                  </div>
                )}

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1 text-center">
                    Enter 6-Digit Verification Code:
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      maxLength={6}
                      value={enteredOtp}
                      onChange={(e) => setEnteredOtp(e.target.value)}
                      placeholder="e.g. 482910"
                      className="w-full glass-input text-center text-xl font-mono tracking-widest text-emerald-400 py-2.5 rounded-xl font-bold"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full btn-success text-xs py-3 flex items-center justify-center gap-2 font-extrabold rounded-2xl shadow-xl shadow-emerald-600/30"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify Code & Sign In</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOtpStep(1)}
                  className="w-full py-1.5 text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Change Email</span>
                </button>
              </form>
            )}
          </div>
        )}

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
