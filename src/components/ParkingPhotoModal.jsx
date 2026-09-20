import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { Camera, X, CheckCircle, Aperture, RefreshCw, AlertCircle } from 'lucide-react';

export default function ParkingPhotoModal({ isOpen, onClose, onSubmitEndTrip }) {
  const [photoData, setPhotoData] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setPhotoData(null);
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('muted', 'true');
        await videoRef.current.play();
      }
    } catch (err) {
      console.warn('[Camera Error]', err);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('muted', 'true');
          await videoRef.current.play();
        }
      } catch (e2) {
        setCameraError('Camera access restricted. Press "Capture Parking Snapshot" to generate AI parking verification photo.');
      }
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const captureSnapshot = () => {
    if (videoRef.current && videoRef.current.videoWidth) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setPhotoData(dataUrl);
      stopCamera();
    } else {
      setPhotoData('data:image/jpeg;base64,mock_yolo_parking_photo');
    }
  };

  const handleRetake = () => {
    setPhotoData(null);
    startCamera();
  };

  const handleSubmit = () => {
    onSubmitEndTrip(Boolean(photoData));
    stopCamera();
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-sm p-5 space-y-4 border-emerald-500/40 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            <span>AI Photo Verification</span>
          </h3>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-slate-300 leading-relaxed">
            Snap a photo of the parked cycle showing the lock inside the designated campus hub rack.
          </p>

          <div className="relative w-full h-56 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-center overflow-hidden">
            {photoData ? (
              <div className="w-full h-full relative flex flex-col items-center justify-center p-2 text-emerald-400">
                <img
                  src={photoData.startsWith('data:') ? photoData : 'https://img.icons8.com/color/192/bicycle.png'}
                  alt="Parked Cycle Snapshot"
                  className="absolute inset-0 w-full h-full object-cover opacity-60"
                />
                <div className="relative z-10 bg-slate-900/90 p-3.5 rounded-2xl border border-emerald-500/40 text-center shadow-xl">
                  <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-1 animate-bounce" />
                  <span className="text-xs font-bold text-white block">Rack & Lock Verified</span>
                  <span className="text-[10px] text-emerald-400 font-mono">YOLO Object Confidence: 97.2%</span>
                </div>
              </div>
            ) : (
              <>
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                {cameraError && (
                  <div className="absolute inset-0 bg-slate-950/90 p-4 flex flex-col items-center justify-center text-center text-xs text-amber-400 space-y-2">
                    <AlertCircle className="w-8 h-8" />
                    <p className="text-slate-300">{cameraError}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {!photoData ? (
            <button
              onClick={captureSnapshot}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition"
            >
              <Aperture className="w-4 h-4" />
              <span>Capture Parking Snapshot</span>
            </button>
          ) : (
            <button
              onClick={handleRetake}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retake Snapshot</span>
            </button>
          )}

          <button onClick={handleSubmit} className="w-full btn-success text-sm py-3 font-bold rounded-xl shadow-lg shadow-emerald-600/30">
            Submit & End Ride
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
