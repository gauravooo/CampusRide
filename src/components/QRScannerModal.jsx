import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

export default function QRScannerModal({ isOpen, onClose, onScanSuccess }) {
  const [errorMsg, setErrorMsg] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const scannerRef = useRef(null);
  const html5QrcodeScanner = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    startScanner();

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async () => {
    setErrorMsg('');
    try {
      if (html5QrcodeScanner.current) {
        await stopScanner();
      }

      const scanner = new Html5Qrcode('qr-reader-element');
      html5QrcodeScanner.current = scanner;

      const config = { fps: 10, qrbox: { width: 220, height: 220 } };

      await scanner.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          console.log('[QR Camera] Scanned:', decodedText);
          stopScanner();
          onScanSuccess(decodedText);
        },
        (error) => {
          // Ignore frequent frame decode errors
        }
      );
      setCameraActive(true);
    } catch (err) {
      console.warn('[QR Camera Error]', err);
      // Fallback to front camera or report permission message
      try {
        if (html5QrcodeScanner.current) {
          await html5QrcodeScanner.current.start(
            { facingMode: 'user' },
            { fps: 10, qrbox: { width: 220, height: 220 } },
            (decodedText) => {
              stopScanner();
              onScanSuccess(decodedText);
            }
          );
          setCameraActive(true);
          return;
        }
      } catch (e2) {
        setErrorMsg('Camera access denied or unreadable. Please allow camera permissions or enter QR code payload manually below.');
        setCameraActive(false);
      }
    }
  };

  const stopScanner = async () => {
    if (html5QrcodeScanner.current && html5QrcodeScanner.current.isScanning) {
      try {
        await html5QrcodeScanner.current.stop();
        html5QrcodeScanner.current.clear();
      } catch (e) {
        console.warn('Stop scanner error:', e);
      }
    }
    setCameraActive(false);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualInput.trim()) {
      stopScanner();
      onScanSuccess(manualInput.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-sm p-4 space-y-4 border-blue-500/30">
        <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Camera className="w-4 h-4 text-blue-400" />
            <span>Web Camera QR Scanner</span>
          </h3>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Camera Viewport */}
        <div className="relative w-full h-56 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex flex-col items-center justify-center">
          <div id="qr-reader-element" className="w-full h-full"></div>

          {errorMsg && (
            <div className="absolute inset-0 bg-slate-950/90 p-4 flex flex-col items-center justify-center text-center text-xs text-amber-400 space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-400" />
              <p>{errorMsg}</p>
              <button
                onClick={startScanner}
                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg font-bold border border-amber-500/30 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Retry Camera
              </button>
            </div>
          )}
        </div>

        {/* Manual QR Code Input */}
        <form onSubmit={handleManualSubmit} className="space-y-2">
          <label className="text-xs text-slate-400 block font-medium">Or enter QR payload / Cycle Code manually:</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. IIMBG-RIDE-001 or BG-CYCLE-001"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              className="w-full glass-input text-xs"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold text-white whitespace-nowrap"
            >
              Scan QR
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
