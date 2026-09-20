import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { Camera, X, CheckCircle, Aperture, RefreshCw, AlertTriangle, MapPin, ShieldCheck, Navigation } from 'lucide-react';
import { haversineDistance } from '../utils/geo';

export default function ParkingPhotoModal({
  isOpen,
  onClose,
  onSubmitEndTrip,
  hubs = [],
  userLocation = { lat: 24.6961, lng: 84.9869 }
}) {
  const [photoData, setPhotoData] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [selectedHubId, setSelectedHubId] = useState(null);
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  // Determine nearest designated drop hub
  const nearestHubData = React.useMemo(() => {
    if (!hubs.length) return { hub: null, dist: 0 };
    let bestHub = hubs[0];
    let minD = Infinity;

    hubs.forEach((h) => {
      const d = haversineDistance(userLocation.lat, userLocation.lng, h.lat, h.lng);
      if (d < minD) {
        minD = d;
        bestHub = h;
      }
    });

    return { hub: bestHub, dist: minD };
  }, [hubs, userLocation]);

  useEffect(() => {
    if (nearestHubData.hub && !selectedHubId) {
      setSelectedHubId(nearestHubData.hub.id);
    }
  }, [nearestHubData, selectedHubId]);

  const activeHub = hubs.find((h) => h.id === Number(selectedHubId)) || nearestHubData.hub;
  const currentDistance = activeHub
    ? haversineDistance(userLocation.lat, userLocation.lng, activeHub.lat, activeHub.lng)
    : 0;

  const geofenceRadius = activeHub?.radius_meters || 60;
  const isWithinGeofence = currentDistance <= geofenceRadius;

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
        setCameraError('Camera access restricted. Tap "Capture Parking Snapshot" to generate parking snapshot.');
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
      setPhotoData('https://img.icons8.com/color/512/bicycle.png');
    }
  };

  const handleRetake = () => {
    setPhotoData(null);
    startCamera();
  };

  const handleSubmit = () => {
    onSubmitEndTrip({
      photoVerified: Boolean(photoData),
      withinGeofence: isWithinGeofence,
      endHubId: activeHub?.id || 1,
      endHubName: activeHub?.name || 'Main Gate',
      geotag: {
        lat: userLocation.lat,
        lng: userLocation.lng,
        distanceMeters: Math.round(currentDistance)
      }
    });
    stopCamera();
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-sm p-5 space-y-4 border-emerald-500/40 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600/30 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">End Ride & Verify Drop</h3>
              <p className="text-[10px] text-emerald-400 font-mono">Geotagging & Geofence Confirmation</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center border border-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Designated Drop Hub Selector & Geofence Indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-bold flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-blue-400" /> Designated Drop Hub:
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {Math.round(currentDistance)}m away
            </span>
          </div>

          <select
            value={selectedHubId || ''}
            onChange={(e) => setSelectedHubId(Number(e.target.value))}
            className="w-full glass-input text-xs py-2 rounded-xl text-white bg-slate-950 font-medium cursor-pointer"
          >
            {hubs.map((h) => {
              const d = Math.round(haversineDistance(userLocation.lat, userLocation.lng, h.lat, h.lng));
              return (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.code}) • ~{d}m
                </option>
              );
            })}
          </select>

          {/* Live Geofence Evaluation Pill */}
          <div
            className={`p-3 rounded-2xl border text-xs flex items-center gap-2.5 transition ${
              isWithinGeofence
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/80 border-amber-500/40 text-amber-300'
            }`}
          >
            {isWithinGeofence ? (
              <>
                <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <div className="text-[11px] leading-tight">
                  <strong className="text-white block">GEOFENCE VERIFIED</strong>
                  <span>Parked within {activeHub?.name} zone ({Math.round(currentDistance)}m &le; {geofenceRadius}m). <strong>+2.0 Trust Score bonus!</strong></span>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <div className="text-[11px] leading-tight">
                  <strong className="text-amber-300 block">OUTSIDE DESIGNATED HUB</strong>
                  <span>{Math.round(currentDistance)}m from {activeHub?.name} (limit: {geofenceRadius}m). Out-of-station penalty applies (-5.0 pts).</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Camera Viewfinder / Captured Geotagged Photo Preview */}
        <div className="relative w-full h-52 bg-slate-950 rounded-2xl border border-white/10 flex flex-col items-center justify-center overflow-hidden">
          {photoData ? (
            <div className="w-full h-full relative flex flex-col items-center justify-center text-emerald-400">
              <img
                src={photoData}
                alt="Cycle Parking Snapshot"
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Geotag Overlay Watermark Badge */}
              <div className="absolute inset-x-2 bottom-2 bg-slate-950/90 backdrop-blur-md p-2.5 rounded-xl border border-white/20 text-left text-[10px] space-y-0.5 shadow-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-blue-400" /> {activeHub?.name}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    GEOTAGGED
                  </span>
                </div>
                <p className="text-slate-300 font-mono">
                  {userLocation.lat.toFixed(5)}° N, {userLocation.lng.toFixed(5)}° E
                </p>
                <p className="text-slate-400 text-[9px]">
                  {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()} • Cycle Locked in Hub Rack
                </p>
              </div>
            </div>
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {cameraError && (
                <div className="absolute inset-0 bg-slate-950/90 p-4 flex flex-col items-center justify-center text-center text-xs text-amber-300 space-y-2">
                  <AlertTriangle className="w-7 h-7 text-amber-400" />
                  <p className="text-slate-300">{cameraError}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {!photoData ? (
            <button
              onClick={captureSnapshot}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-98"
            >
              <Aperture className="w-4 h-4" />
              <span>Snap Hub Parking Photo</span>
            </button>
          ) : (
            <button
              onClick={handleRetake}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-white/10 flex items-center justify-center gap-2 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retake Photo</span>
            </button>
          )}

          <button
            onClick={handleSubmit}
            className={`w-full py-3.5 text-xs font-extrabold rounded-2xl shadow-xl transition flex items-center justify-center gap-2 ${
              isWithinGeofence
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30'
                : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-600/30'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>
              {isWithinGeofence ? 'Confirm Drop & Complete Ride (+2.0)' : 'Confirm Drop With Warning (-5.0)'}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
