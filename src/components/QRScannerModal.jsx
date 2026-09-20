import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, X, RefreshCw, AlertTriangle, Upload, Zap, Search, Bike, Keyboard } from 'lucide-react';

export default function QRScannerModal({ isOpen, onClose, onScanSuccess, availableCycles = [] }) {
  const [errorMsg, setErrorMsg] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' or 'user'
  const [manualCode, setManualCode] = useState('');
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' or 'manual' or 'list'
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      startWebcamStream(facingMode);
    } else {
      stopWebcamStream();
    }
    return () => {
      stopWebcamStream();
    };
  }, [isOpen, facingMode]);

  const startWebcamStream = async (mode) => {
    setErrorMsg('');
    setIsScanning(false);
    stopWebcamStream();

    try {
      const constraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err1) {
        console.warn('Initial camera constraint failed, retrying basic video:', err1);
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('muted', 'true');
        await videoRef.current.play();
        setIsScanning(true);
        requestAnimationFrame(tickScanFrame);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setErrorMsg('Camera stream not accessible on this device. Use manual code entry or select a cycle below.');
      setIsScanning(false);
    }
  };

  const stopWebcamStream = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const tickScanFrame = () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(tickScanFrame);
      return;
    }

    const video = videoRef.current;
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert'
    });

    if (code && code.data) {
      console.log('[jsQR Decoded Code]:', code.data);
      stopWebcamStream();
      if (navigator.vibrate) navigator.vibrate(100);
      onScanSuccess(code.data);
      return;
    }

    animationFrameRef.current = requestAnimationFrame(tickScanFrame);
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Native Mobile File Input Camera Scan
  const handleFileUploadScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          stopWebcamStream();
          onScanSuccess(code.data);
        } else {
          alert('No QR code detected in the photo. Please enter code manually.');
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    stopWebcamStream();
    onScanSuccess(manualCode.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-sm p-5 space-y-4 border-blue-500/40 shadow-2xl relative rounded-3xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 flex items-center justify-center text-blue-400 border border-blue-500/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white leading-tight">Unlock Campus Cycle</h3>
              <p className="text-[10px] text-blue-400 font-medium">Scan QR or enter cycle code</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopWebcamStream();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white border border-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher: Camera | Manual PIN | Select List */}
        <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-xl border border-white/5 text-[11px] font-bold">
          <button
            onClick={() => setActiveTab('camera')}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition ${activeTab === 'camera' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Camera</span>
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition ${activeTab === 'manual' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Enter Code</span>
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1 transition ${activeTab === 'list' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <Bike className="w-3.5 h-3.5" />
            <span>Fleet List</span>
          </button>
        </div>

        {/* Tab 1: Live WebRTC Camera Scan */}
        {activeTab === 'camera' && (
          <div className="space-y-3">
            <div className="relative w-full h-64 bg-black rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Laser Scanning Overlay */}
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-blue-500/60 rounded-2xl relative flex items-center justify-center">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-400 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-400 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-400 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-400 rounded-br-lg"></div>
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse shadow-[0_0_12px_#3b82f6]"></div>
                  </div>
                </div>
              )}

              {/* Camera Error / Permission Fallback Overlay */}
              {errorMsg && (
                <div className="absolute inset-0 bg-slate-950/95 p-4 flex flex-col items-center justify-center text-center text-xs text-amber-300 space-y-2.5 z-20">
                  <AlertTriangle className="w-9 h-9 text-amber-400" />
                  <p className="leading-relaxed text-slate-300">{errorMsg}</p>
                  <button
                    onClick={() => startWebcamStream(facingMode)}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-1.5 transition text-xs shadow-lg shadow-blue-600/30"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Re-start Camera
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={toggleCamera}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                <span>Switch Camera</span>
              </button>

              <button
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                className="flex-1 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-semibold rounded-xl border border-blue-500/30 flex items-center justify-center gap-1.5 transition"
              >
                <Upload className="w-3.5 h-3.5 text-blue-400" />
                <span>Photo Snap</span>
              </button>
            </div>

            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handleFileUploadScan}
              className="hidden"
            />
          </div>
        )}

        {/* Tab 2: Manual Code Entry */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="space-y-4 py-2">
            <div className="text-center space-y-1">
              <p className="text-xs text-slate-300 font-medium">Enter cycle number printed on the lock or frame:</p>
              <p className="text-[10px] text-slate-400">e.g. <span className="text-blue-400 font-mono font-bold">CR-001</span> or <span className="text-blue-400 font-mono font-bold">001</span></p>
            </div>

            <input
              type="text"
              placeholder="e.g. CR-001"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="w-full glass-input text-center text-xl font-bold tracking-widest text-emerald-400 uppercase font-mono py-3"
              autoFocus
            />

            <button
              type="submit"
              className="w-full btn-primary py-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Unlock Cycle Now</span>
            </button>
          </form>
        )}

        {/* Tab 3: Quick Fleet List Picker */}
        {activeTab === 'list' && (
          <div className="space-y-2 py-1">
            <p className="text-xs text-slate-300 font-semibold mb-1">Select from available fleet cycles:</p>
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {availableCycles.slice(0, 30).map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    stopWebcamStream();
                    onScanSuccess(c.qrCode);
                  }}
                  className="p-2.5 bg-slate-900/80 hover:bg-blue-900/40 rounded-xl border border-white/5 flex items-center justify-between cursor-pointer transition"
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-500/30">
                      🚲
                    </div>
                    <div>
                      <strong className="text-xs font-bold text-white block">{c.code}</strong>
                      <span className="text-[10px] text-slate-400 font-mono">PIN: {c.lockPin}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {c.batteryPct}% BLE
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
