import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import StudentView from './components/StudentView';
import AdminView from './components/AdminView';
import AuthModal from './components/AuthModal';
import { CAMPUS_HUBS, generateInitialCycles } from './data/initialData';
import { api } from './services/api';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('campus_user');
    return saved
      ? JSON.parse(saved)
      : { id: 1, name: 'Aarav Sharma', email: 'aarav.s2025@iimbg.ac.in', role: 'student', trustScore: 98.5 };
  });

  const [hubs, setHubs] = useState(() => {
    const saved = localStorage.getItem('campus_hubs_cache');
    return saved ? JSON.parse(saved) : CAMPUS_HUBS;
  });

  const [users, setUsers] = useState([
    { id: 1, name: 'Aarav Sharma', email: 'aarav.s2025@iimbg.ac.in', role: 'student', trustScore: 98.5 },
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

  // Load persistent data from Cloudflare D1 SQL / API
  useEffect(() => {
    async function loadData() {
      const remoteUsers = await api.getUsers();
      if (remoteUsers && remoteUsers.length > 0) {
        setUsers(remoteUsers);
        // Sync currentUser trust score
        const found = remoteUsers.find((u) => u.email === currentUser.email);
        if (found) {
          setCurrentUser((prev) => ({ ...prev, trustScore: found.trustScore }));
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
    }
    loadData();
  }, []);

  // Save state updates to LocalStorage
  useEffect(() => {
    localStorage.setItem('campus_user', JSON.stringify(currentUser));
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
    const newTrip = {
      id: Date.now(),
      cycleId: cycle.id,
      cycleCode: cycle.code,
      batteryPct: cycle.batteryPct,
      startTime: new Date().toISOString(),
      startHubId: cycle.hubId
    };

    setActiveTrip(newTrip);

    setCycles((prev) =>
      prev.map((c) => (c.id === cycle.id ? { ...c, status: 'in_use' } : c))
    );
  };

  const handleEndTrip = (result) => {
    if (!activeTrip) return;

    const { photoVerified, withinGeofence, endHubId, endHubName } = result;

    // Trust delta calculation
    let trustDelta = 0.0;
    if (withinGeofence && photoVerified) {
      trustDelta = +2.0; // Proper parking within designated hub with photo confirmation
    } else if (withinGeofence && !photoVerified) {
      trustDelta = +0.5;
    } else {
      trustDelta = -5.0; // Penalty for dropping bike outside designated campus hub
    }

    const newScore = Math.min(100.0, Math.max(0.0, (currentUser.trustScore || 100.0) + trustDelta));

    // Update currentUser and persist to D1
    setCurrentUser((prev) => ({ ...prev, trustScore: newScore }));
    handleAdjustTrustScore(currentUser.id, newScore, `Ride completed at ${endHubName || 'Campus Hub'}`);

    // Relocate cycle to designated drop-off hub
    setCycles((prev) =>
      prev.map((c) =>
        c.id === activeTrip.cycleId
          ? {
              ...c,
              status: 'available',
              hubId: endHubId || c.hubId,
              lat: hubs.find((h) => h.id === endHubId)?.lat || c.lat,
              lng: hubs.find((h) => h.id === endHubId)?.lng || c.lng,
              totalTrips: (c.totalTrips || 0) + 1
            }
          : c
      )
    );

    setActiveTrip(null);

    alert(
      withinGeofence
        ? `🎉 Ride Completed! Drop-off verified at designated hub '${endHubName}'. Trust Score +2.0 pts.`
        : `⚠️ Ride Completed! Drop-off occurred OUTSIDE designated station bounds. Trust Score penalized (${trustDelta} pts).`
    );
  };

  // Admin adjustments (saved to Cloudflare D1 SQL & local state)
  const handleAdjustTrustScore = async (userId, newScore, reason) => {
    const updatedUsers = await api.adjustTrustScore(userId, newScore, reason);
    setUsers(updatedUsers);
    if (currentUser.id === userId) {
      setCurrentUser((prev) => ({ ...prev, trustScore: newScore }));
    }
  };

  const handleSaveHub = async (hubData) => {
    const updatedHubs = await api.saveHub(hubData);
    setHubs(updatedHubs);
  };

  const handleDeleteHub = async (hubId) => {
    const updatedHubs = await api.deleteHub(hubId);
    setHubs(updatedHubs);
  };

  const handleLogin = async (userData) => {
    const saved = await api.loginUser(userData.email, userData.name, userData.picture);
    setCurrentUser(saved);
    setUsers((prev) => {
      const exists = prev.some((u) => u.email === saved.email);
      return exists ? prev.map((u) => (u.email === saved.email ? saved : u)) : [...prev, saved];
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('campus_user');
    setCurrentUser(null);
    setShowAuthModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      <main className="max-w-xl mx-auto px-3 pt-3">
        <Navbar
          currentUser={currentUser}
          onOpenAuth={() => setShowAuthModal(true)}
          onLogout={handleLogout}
        />

        <Routes>
          <Route
            path="/"
            element={
              <StudentView
                currentUser={currentUser}
                hubs={hubs}
                cycles={cycles}
                activeTrip={activeTrip}
                onStartTrip={handleStartTrip}
                onEndTrip={handleEndTrip}
                userLocation={userLocation}
              />
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
                onAdjustTrustScore={handleAdjustTrustScore}
                onSaveHub={handleSaveHub}
                onDeleteHub={handleDeleteHub}
                currentUser={currentUser}
              />
            }
          />
        </Routes>
      </main>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={handleLogin}
      />
    </div>
  );
}
