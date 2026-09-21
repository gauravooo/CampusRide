import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import StudentView from './components/StudentView';
import AdminView from './components/AdminView';
import AuthModal from './components/AuthModal';
import { CAMPUS_HUBS, generateInitialCycles } from './data/initialData';
import { api } from './services/api';
import TripCompleteModal from './components/TripCompleteModal';

export default function App() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('campus_user');
    const adminUnlocked = localStorage.getItem('admin_unlocked') === 'true';
    if (saved && saved !== 'null' && saved !== 'undefined') {
      try {
        const parsed = JSON.parse(saved);
        if (
          parsed &&
          typeof parsed === 'object' &&
          parsed.email &&
          !parsed.isDemo &&
          parsed.email !== 'aarav.s2025@iimbg.ac.in'
        ) {
          return parsed;
        }
      } catch (e) {}
    }
    if (adminUnlocked) {
      return {
        id: 999,
        name: 'Campus Fleet Admin',
        email: 'admin@iimbg.ac.in',
        role: 'admin',
        trustScore: 100.0,
        isAdminPinAuth: true
      };
    }
    return null;
  });

  const [hubs, setHubs] = useState(() => {
    const saved = localStorage.getItem('campus_hubs_cache');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return CAMPUS_HUBS;
  });

  const [users, setUsers] = useState([
    { id: 1, name: 'Student Rider', email: 'student.2025@iimbg.ac.in', role: 'student', trustScore: 98.5 },
    { id: 2, name: 'Priya Patel', email: 'priya.p2025@iimbg.ac.in', role: 'student', trustScore: 92.0 },
    { id: 3, name: 'Rohan Verma', email: 'rohan.v2025@iimbg.ac.in', role: 'student', trustScore: 100.0 },
    { id: 4, name: 'Sneha Mukherjee', email: 'sneha.m2025@iimbg.ac.in', role: 'student', trustScore: 88.0 },
    { id: 5, name: 'Campus Fleet Admin', email: 'admin@iimbg.ac.in', role: 'admin', trustScore: 100.0 }
  ]);

  const [cycles, setCycles] = useState(() => {
    const saved = localStorage.getItem('campus_cycles');
    return saved ? JSON.parse(saved) : generateInitialCycles();
  });

  const [activeTrip, setActiveTrip] = useState(() => {
    const saved = localStorage.getItem('campus_active_trip');
    return saved ? JSON.parse(saved) : null;
  });

  const [showAuthModal, setShowAuthModal] = useState(false);

  const [userLocation, setUserLocation] = useState({ lat: 24.6808, lng: 84.9665 });
  const [completedTripResult, setCompletedTripResult] = useState(null);
  const [trips, setTrips] = useState([]);

  // Purge any legacy demo user on mount
  useEffect(() => {
    const saved = localStorage.getItem('campus_user');
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p?.isDemo || p?.email === 'aarav.s2025@iimbg.ac.in') {
          localStorage.removeItem('campus_user');
          setCurrentUser(null);
        }
      } catch (e) {}
    }
  }, []);

  // Load persistent data from Cloudflare D1 SQL / API
  useEffect(() => {
    async function loadData() {
      const remoteUsers = await api.getUsers();
      if (remoteUsers && remoteUsers.length > 0) {
        setUsers(remoteUsers);
        // Sync currentUser trust score safely
        if (currentUser?.email) {
          const found = remoteUsers.find((u) => u.email === currentUser.email);
          if (found) {
            setCurrentUser((prev) => (prev ? { ...prev, trustScore: found.trustScore } : prev));
          }
        }
      }

      const remoteHubs = await api.getHubs();
      if (remoteHubs && remoteHubs.length > 0) {
        setHubs(remoteHubs);
        // Ensure cycles in state/cache are synced to real hub coordinates
        setCycles((prevCycles) => {
          return prevCycles.map((c) => {
            const h = remoteHubs.find((hub) => hub.id === c.hubId);
            if (h) {
              const diff = Math.abs(c.lat - h.lat) + Math.abs(c.lng - h.lng);
              if (diff > 0.003) {
                return {
                  ...c,
                  lat: h.lat + (Math.random() - 0.5) * 0.0003,
                  lng: h.lng + (Math.random() - 0.5) * 0.0003
                };
              }
            }
            return c;
          });
        });
      }

      const remoteTrips = await api.getTrips();
      if (remoteTrips && remoteTrips.length > 0) {
        setTrips(remoteTrips);
      }
    }
    loadData();
  }, []);

  // Save state updates to LocalStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('campus_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('campus_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('campus_cycles', JSON.stringify(cycles));
  }, [cycles]);

  useEffect(() => {
    if (activeTrip) {
      localStorage.setItem('campus_active_trip', JSON.stringify(activeTrip));
    } else {
      localStorage.removeItem('campus_active_trip');
    }
  }, [activeTrip]);

  // Geolocation API with high accuracy
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.warn('Geolocation fallback to campus center'),
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  }, []);

  // Register Service Worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => console.log('CampusRide PWA ServiceWorker active'))
        .catch((err) => console.error('ServiceWorker error:', err));
    }
  }, []);

  const handleStartTrip = (cycle) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    if (currentUser.role === 'admin') {
      alert('Admin Mode: Fleet administrators cannot start rides. Please log out and sign in with a student account to ride.');
      return;
    }
    const startHub = hubs.find((h) => String(h.id) === String(cycle.hubId));
    const newTrip = {
      id: Date.now(),
      cycleId: cycle.id,
      cycleCode: cycle.code,
      batteryPct: cycle.batteryPct,
      startTime: new Date().toISOString(),
      startHubId: cycle.hubId || 1,
      startHubName: startHub?.name || 'Main Gate',
      userId: currentUser?.id || 1,
      userName: currentUser?.name || currentUser?.email?.split('@')[0] || 'Student Rider',
      userEmail: currentUser?.email || 'student@iimbg.ac.in'
    };

    setActiveTrip(newTrip);

    setCycles((prev) =>
      prev.map((c) => (c.id === cycle.id ? { ...c, status: 'in_use' } : c))
    );
  };

  const handleEndTrip = (result) => {
    if (!activeTrip) return;

    const { photoVerified, photoUrl, withinGeofence, endHubId, endHubName, isDemoSimulated } = result;

    // Calculate trip duration for statistics
    let durationSeconds = 0;
    if (activeTrip.startTime) {
      const startMs = new Date(activeTrip.startTime).getTime();
      durationSeconds = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
    }

    // Trust delta calculation
    let trustDelta = 0.0;
    if (withinGeofence && photoVerified) {
      trustDelta = +2.0; // Proper parking within designated hub with photo confirmation
    } else if (withinGeofence && !photoVerified) {
      trustDelta = +0.5;
    } else {
      trustDelta = -5.0; // Penalty for dropping bike outside designated campus hub
    }

    const currentScore = typeof currentUser?.trustScore === 'number' ? currentUser.trustScore : 100.0;
    const newScore = Math.min(100.0, Math.max(0.0, currentScore + trustDelta));

    // Target hub coordinates and resolved names
    const targetHub = hubs.find((h) => String(h.id) === String(endHubId));
    const startHub = hubs.find((h) => String(h.id) === String(activeTrip.startHubId));

    const finalStartHubName = (activeTrip.startHubName && activeTrip.startHubName !== 'Campus Hub')
      ? activeTrip.startHubName
      : (startHub?.name || 'Main Gate');
    const finalEndHubName = (endHubName && endHubName !== 'Campus Hub')
      ? endHubName
      : (targetHub?.name || 'Academic Block');
    const finalUserName = currentUser?.name || activeTrip.userName || currentUser?.email?.split('@')[0] || 'Student Rider';
    const finalUserEmail = currentUser?.email || activeTrip.userEmail || 'student@iimbg.ac.in';
    const finalUserId = currentUser?.id || activeTrip.userId || 1;

    // Update currentUser and persist to D1 safely
    if (currentUser) {
      setCurrentUser((prev) => (prev ? { ...prev, trustScore: newScore } : prev));
      if (currentUser.id) {
        handleAdjustTrustScore(currentUser.id, newScore, `Ride completed at ${finalEndHubName}`);
      }
    }

    const durationMinutes = Math.max(0.5, Math.round((durationSeconds / 60) * 10) / 10);
    const completedTripRecord = {
      id: Date.now(),
      userId: finalUserId,
      userName: finalUserName,
      userEmail: finalUserEmail,
      cycleId: activeTrip.cycleId,
      cycleCode: activeTrip.cycleCode,
      startHubId: activeTrip.startHubId || 1,
      startHubName: finalStartHubName,
      endHubId: endHubId || activeTrip.startHubId || 1,
      endHubName: finalEndHubName,
      startTime: activeTrip.startTime,
      endTime: new Date().toISOString(),
      durationMinutes,
      photoVerified: Boolean(photoVerified),
      photoUrl: photoUrl || null,
      trustDelta,
      withinGeofence: Boolean(withinGeofence),
      status: 'completed'
    };

    api.saveTrip(completedTripRecord)
      .then((updatedTrips) => {
        if (Array.isArray(updatedTrips)) {
          setTrips(updatedTrips);
        } else {
          setTrips((prev) => [completedTripRecord, ...prev]);
        }
      })
      .catch((err) => {
        console.warn('Failed to save trip to API:', err);
        setTrips((prev) => [completedTripRecord, ...prev]);
      });

    // Relocate cycle to designated drop-off hub
    setCycles((prev) =>
      prev.map((c) =>
        String(c.id) === String(activeTrip.cycleId)
          ? {
              ...c,
              status: 'available',
              hubId: endHubId || c.hubId,
              lat: targetHub?.lat ?? c.lat,
              lng: targetHub?.lng ?? c.lng,
              totalTrips: (c.totalTrips || 0) + 1
            }
          : c
      )
    );

    const endedTripCycleCode = activeTrip.cycleCode;

    // Unconditionally clear active trip
    setActiveTrip(null);
    localStorage.removeItem('campus_active_trip');

    // Trigger modern in-app trip completion modal
    setCompletedTripResult({
      cycleCode: endedTripCycleCode,
      durationSeconds,
      co2Grams: Math.round(durationSeconds * 0.15),
      calories: Math.round(durationSeconds * 0.08),
      endHubName: endHubName || 'Campus Hub',
      withinGeofence,
      photoVerified,
      trustDelta,
      newTrustScore: newScore,
      isDemoSimulated: Boolean(isDemoSimulated)
    });
  };

  // Admin adjustments (saved to Cloudflare D1 SQL & local state)
  const handleAdjustTrustScore = async (userId, newScore, reason) => {
    try {
      const updatedUsers = await api.adjustTrustScore(userId, newScore, reason);
      if (Array.isArray(updatedUsers)) {
        setUsers(updatedUsers);
      }
      setCurrentUser((prev) => {
        if (prev && String(prev.id) === String(userId)) {
          return { ...prev, trustScore: newScore };
        }
        return prev;
      });
    } catch (err) {
      console.error('Failed to adjust trust score:', err);
    }
  };

  const handleSaveHub = async (hubData) => {
    try {
      const updatedHubs = await api.saveHub(hubData);
      if (Array.isArray(updatedHubs)) {
        setHubs(updatedHubs);
      } else {
        const fresh = await api.getHubs();
        if (Array.isArray(fresh)) setHubs(fresh);
      }
    } catch (err) {
      console.error('Failed to save hub:', err);
    }
  };

  const handleDeleteHub = async (hubId) => {
    try {
      const updatedHubs = await api.deleteHub(hubId);
      if (Array.isArray(updatedHubs)) {
        setHubs(updatedHubs);
      } else {
        const fresh = await api.getHubs();
        if (Array.isArray(fresh)) setHubs(fresh);
      }
    } catch (err) {
      console.error('Failed to delete hub:', err);
    }
  };

  const handleLogin = async (userData) => {
    const saved = await api.loginUser(userData.email, userData.name, userData.picture);
    const enriched = {
      ...saved,
      isDemo: Boolean(userData.isDemo)
    };
    setCurrentUser(enriched);
    setUsers((prev) => {
      const exists = prev.some((u) => u.email === enriched.email);
      return exists ? prev.map((u) => (u.email === enriched.email ? enriched : u)) : [...prev, enriched];
    });
  };

  const handleAdminLogin = () => {
    const adminUser = {
      id: 999,
      name: 'Campus Fleet Admin',
      email: 'admin@iimbg.ac.in',
      role: 'admin',
      trustScore: 100.0,
      isAdminPinAuth: true
    };
    setCurrentUser(adminUser);
    localStorage.setItem('campus_user', JSON.stringify(adminUser));
    localStorage.setItem('admin_unlocked', 'true');
    setShowAuthModal(false);
    navigate('/admin');
  };

  const handleLogout = () => {
    localStorage.removeItem('campus_user');
    localStorage.removeItem('admin_unlocked');
    setCurrentUser(null);
    navigate('/');
    setShowAuthModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      <main className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 pb-16">
        <Navbar
          currentUser={currentUser}
          onOpenAuth={() => setShowAuthModal(true)}
          onLogout={handleLogout}
        />

        <Routes>
          <Route
            path="/"
            element={
              currentUser?.role === 'admin' ? (
                <Navigate to="/admin" replace />
              ) : (
                <StudentView
                  currentUser={currentUser}
                  hubs={hubs}
                  cycles={cycles}
                  activeTrip={activeTrip}
                  onStartTrip={handleStartTrip}
                  onEndTrip={handleEndTrip}
                  userLocation={userLocation}
                  onRequireAuth={() => setShowAuthModal(true)}
                />
              )
            }
          />
          <Route
            path="/admin"
            element={
              <AdminView
                hubs={hubs}
                cycles={cycles}
                activeTrip={activeTrip}
                users={users}
                trips={trips}
                onAdjustTrustScore={handleAdjustTrustScore}
                onSaveHub={handleSaveHub}
                onDeleteHub={handleDeleteHub}
                currentUser={currentUser}
                onAdminLogin={handleAdminLogin}
                onLogout={handleLogout}
              />
            }
          />
        </Routes>
      </main>

      <AuthModal
        isOpen={showAuthModal && (!currentUser || currentUser.role !== 'admin')}
        onClose={() => setShowAuthModal(false)}
        onLogin={handleLogin}
        onAdminLogin={handleAdminLogin}
      />

      <TripCompleteModal
        isOpen={Boolean(completedTripResult)}
        onClose={() => setCompletedTripResult(null)}
        tripResult={completedTripResult}
      />
    </div>
  );
}
