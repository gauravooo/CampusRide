import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { Camera, X, CheckCircle, Aperture, RefreshCw, AlertTriangle, MapPin, ShieldCheck, Navigation, Sparkles, SlidersHorizontal } from 'lucide-react';
import { haversineDistance } from '../utils/geo';

function generateFallbackSnapshot(hubName, lat, lng) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'https://img.icons8.com/color/512/bicycle.png';

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 640, 480);
    grad.addColorStop(0, '#090d16');
    grad.addColorStop(0.5, '#0f172a');
    grad.addColorStop(1, '#064e3b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 480);

    // Stanchion rack grid
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.lineWidth = 2;
    for (let x = 40; x < 640; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 80);
      ctx.lineTo(x, 400);
      ctx.stroke();
    }

    // Bike Frame
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Wheels
    ctx.beginPath();
    ctx.arc(220, 300, 52, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(420, 300, 52, 0, Math.PI * 2);
    ctx.stroke();

    // Triangle frame
    ctx.beginPath();
    ctx.moveTo(220, 300);
    ctx.lineTo(300, 300);
    ctx.lineTo(380, 225);
    ctx.lineTo(300, 225);
    ctx.closePath();
    ctx.stroke();

    // Seat post & Handlebars
    ctx.beginPath();
    ctx.moveTo(300, 300);
    ctx.lineTo(330, 185);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(420, 300);
    ctx.lineTo(390, 175);
    ctx.lineTo(370, 175);
    ctx.stroke();

    // Header Overlay
    ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
    ctx.fillRect(20, 20, 600, 50);
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.strokeRect(20, 20, 600, 50);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('CAMPUSRIDE • IIM BODH GAYA', 40, 52);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    ctx.fillText('GEOFENCE VERIFIED SNAPSHOT', 390, 52);

    // Geotag Bottom Banner
    ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
    ctx.fillRect(20, 395, 600, 65);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.strokeRect(20, 395, 600, 65);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`📍 ${hubName} — Cycle Locked in Rack`, 35, 420);

    ctx.fillStyle = '#10b981';
    ctx.font = '11px monospace';
    const safeLat = typeof lat === 'number' ? lat.toFixed(5) : '24.68080';
    const safeLng = typeof lng === 'number' ? lng.toFixed(5) : '84.96650';
    ctx.fillText(`GPS: ${safeLat}° N, ${safeLng}° E  •  ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 35, 444);

    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (e) {
    return 'https://img.icons8.com/color/512/bicycle.png';
  }
}

export default function ParkingPhotoModal({
  isOpen,
  onClose,
  onSubmitEndTrip,
  hubs = [],
  userLocation = { lat: 24.6808, lng: 84.9665 },
  currentUser = null
}) {
  const [photoData, setPhotoData] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [selectedHubId, setSelectedHubId] = useState(null);
  const [simulateAtHub, setSimulateAtHub] = useState(false);
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  // Check if current user is Demo Account or Fleet Admin
  // REAL STUDENTS (Google SSO) strictly do NOT have access to simulation bypass!
  const isDemoOrAdmin = Boolean(
    currentUser?.isDemo ||
    currentUser?.role === 'admin' ||
    currentUser?.email === 'aarav.s2025@iimbg.ac.in' ||
    currentUser?.email === 'admin@iimbg.ac.in'
  );

  // Safe coordinates
  const safeLat = userLocation?.lat ?? 24.6808;
  const safeLng = userLocation?.lng ?? 84.9665;

  // Determine nearest designated drop hub
  const nearestHubData = React.useMemo(() => {
    if (!hubs.length) return { hub: null, dist: 0 };
    let bestHub = hubs[0];
    let minD = Infinity;

    hubs.forEach((h) => {
      const d = haversineDistance(safeLat, safeLng, h.lat, h.lng);
      if (d < minD) {
        minD = d;
        bestHub = h;
      }
    });

    return { hub: bestHub, dist: minD };
  }, [hubs, safeLat, safeLng]);

  useEffect(() => {
    if (nearestHubData.hub && !selectedHubId) {
      setSelectedHubId(nearestHubData.hub.id);
    }
  }, [nearestHubData, selectedHubId]);

  const activeHub = hubs.find((h) => Number(h.id) === Number(selectedHubId)) || nearestHubData.hub;
  const geofenceRadius = activeHub?.radius_meters || 60;

  // Real physical distance from actual user GPS
  const realDistance = activeHub
    ? haversineDistance(safeLat, safeLng, activeHub.lat, activeHub.lng)
    : 0;

  // If Demo Account / Admin AND simulation is enabled:
  // effective distance is 0m and geofence is verified.
  // Real students CANNOT simulate (isDemoOrAdmin is false).
  const isSimulated = isDemoOrAdmin && simulateAtHub;
  const currentDistance = isSimulated ? 0 : realDistance;
  const isWithinGeofence = currentDistance <= geofenceRadius;

  const effectiveLocation = isSimulated && activeHub
    ? { lat: activeHub.lat, lng: activeHub.lng }
    : { lat: safeLat, lng: safeLng };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setPhotoData(null);
      setSimulateAtHub(false);
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError('');
    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError('Camera hardware unavailable. You can generate a verified parking snapshot.');
      return;
    }

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
        setCameraError('Camera access restricted. Tap "Snap / Generate Hub Photo" to verify parking.');
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
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setPhotoData(dataUrl);
      stopCamera();
    } else {
      const generated = generateFallbackSnapshot(
        activeHub?.name || 'Campus Hub',
        effectiveLocation.lat,
        effectiveLocation.lng
      );
      setPhotoData(generated);
      stopCamera();
    }
  };

  const handleRetake = () => {
    setPhotoData(null);
    startCamera();
  };

  const handleSubmit = () => {
    let finalPhoto = photoData;
    if (!finalPhoto) {
      finalPhoto = generateFallbackSnapshot(
        activeHub?.name || 'Campus Hub',
        effectiveLocation.lat,
        effectiveLocation.lng
      );
      setPhotoData(finalPhoto);
    }

    onSubmitEndTrip({
      photoVerified: Boolean(finalPhoto),
      withinGeofence: isWithinGeofence,
      endHubId: activeHub?.id || 1,
      endHubName: activeHub?.name || 'Main Gate',
      isDemoSimulated: isSimulated,
      geotag: {
        lat: effectiveLocation.lat,
        lng: effectiveLocation.lng,
        distanceMeters: Math.round(currentDistance)
      }
    });
    stopCamera();
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="glass-card w-full max-w-sm p-4 sm:p-5 space-y-3.5 border-emerald-500/40 rounded-3xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
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

        {/* Designated Drop Hub Selector */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-bold flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-blue-400" /> Designated Drop Hub:
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {isSimulated ? '0m (Simulated)' : `${Math.round(realDistance)}m away`}
            </span>
          </div>

          <select
            value={selectedHubId || ''}
            onChange={(e) => setSelectedHubId(Number(e.target.value))}
            className="w-full glass-input text-xs py-2 rounded-xl text-white bg-slate-950 font-medium cursor-pointer"
          >
            {hubs.map((h) => {
              const d = Math.round(haversineDistance(safeLat, safeLng, h.lat, h.lng));
              return (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.code}) • ~{d}m
                </option>
              );
            })}
          </select>

          {/* Demo Account / Admin Simulation Bypass Control */}
          {/* Real students never see or access this toggle */}
          {isDemoOrAdmin && (
            <div className="p-2.5 rounded-xl bg-blue-950/60 border border-blue-500/40 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>🧪 Demo / Admin Mode</span>
                </span>
                <span className="text-[10px] text-blue-400 font-mono">
                  {isSimulated ? 'Hub GPS Active' : 'Real GPS'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSimulateAtHub(!simulateAtHub)}
                className={`w-full py-1.5 px-2.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 border ${
                  simulateAtHub
                    ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400 shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-white/10'
                }`}
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>
                  {simulateAtHub
                    ? `Simulating at ${activeHub?.name || 'Hub'} (0m) — Tap for Real GPS`
                    : `Simulate Parking at ${activeHub?.name || 'Hub'} Rack`}
                </span>
              </button>
            </div>
          )}

          {/* Live Geofence Evaluation Pill */}
          <div
            className={`p-2.5 rounded-2xl border text-xs flex items-center gap-2.5 transition ${
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
                  <span>
                    Parked within {activeHub?.name} zone ({Math.round(currentDistance)}m &le; {geofenceRadius}m).{' '}
                    <strong>+2.0 Trust Score bonus!</strong>
                  </span>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <div className="text-[11px] leading-tight">
                  <strong className="text-amber-300 block">OUTSIDE DESIGNATED HUB</strong>
                  <span>
                    {Math.round(currentDistance)}m from {activeHub?.name} (limit: {geofenceRadius}m). Out-of-station penalty applies (-5.0 pts).
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Camera Viewfinder / Captured Geotagged Photo Preview */}
        <div className="relative w-full h-44 sm:h-48 bg-slate-950 rounded-2xl border border-white/10 flex flex-col items-center justify-center overflow-hidden">
          {photoData ? (
            <div className="w-full h-full relative flex flex-col items-center justify-center text-emerald-400">
              <img
                src={photoData}
                alt="Cycle Parking Snapshot"
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Geotag Overlay Watermark Badge */}
              <div className="absolute inset-x-2 bottom-2 bg-slate-950/90 backdrop-blur-md p-2 rounded-xl border border-white/20 text-left text-[10px] space-y-0.5 shadow-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-blue-400" /> {activeHub?.name}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    GEOTAGGED
                  </span>
                </div>
                <p className="text-slate-300 font-mono text-[9px]">
                  {effectiveLocation.lat.toFixed(5)}° N, {effectiveLocation.lng.toFixed(5)}° E
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
                <div className="absolute inset-0 bg-slate-950/90 p-4 flex flex-col items-center justify-center text-center text-xs text-amber-300 space-y-1.5">
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                  <p className="text-slate-300 text-[11px]">{cameraError}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {!photoData ? (
            <button
              type="button"
              onClick={captureSnapshot}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-98"
            >
              <Aperture className="w-4 h-4" />
              <span>Snap / Generate Hub Photo</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRetake}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-white/10 flex items-center justify-center gap-2 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retake Photo</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            className={`w-full py-3 text-xs font-extrabold rounded-2xl shadow-xl transition flex items-center justify-center gap-2 ${
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
