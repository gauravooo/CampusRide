import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import StudentView from './components/StudentView';
import AdminView from './components/AdminView';
import AuthModal from './components/AuthModal';
import { CAMPUS_HUBS, generateInitialCycles } from './data/initialData';

export default function App() {
  const [activeTab, setActiveTab] = useState('student');
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('campus_user');
    return saved
      ? JSON.parse(saved)
      : { id: 1, name: 'Aarav Sharma', email: 'aarav.s2025@iimbg.ac.in', role: 'student', trustScore: 98.5 };
  });

  const [hubs] = useState(CAMPUS_HUBS);
  const [cycles, setCycles] = useState(() => {
    const saved = localStorage.getItem('campus_cycles');
    return saved ? JSON.parse(saved) : generateInitialCycles();
  });

  const [activeTrip, setActiveTrip] = useState(() => {
    const saved = localStorage.getItem('campus_active_trip');
    return saved ? JSON.parse(saved) : null;
  });

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userLocation, setUserLocation] = useState({ lat: 24.6961, lng: 84.9869 });

  // Save state updates
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

  // Geolocation API
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.warn('Geolocation fallback to campus center')
      );
    }
  }, []);

  // Register Service Worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => console.log('PWA ServiceWorker registered'))
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

  const handleEndTrip = (photoVerified) => {
    if (!activeTrip) return;

    const trustDelta = photoVerified ? +2.0 : -5.0;

    setCurrentUser((prev) => ({
      ...prev,
      trustScore: Math.min(100.0, Math.max(0.0, prev.trustScore + trustDelta))
    }));

    setCycles((prev) =>
      prev.map((c) =>
        c.id === activeTrip.cycleId
          ? { ...c, status: 'available', totalTrips: c.totalTrips + 1 }
          : c
      )
    );

    setActiveTrip(null);
    alert(
      photoVerified
        ? '🎉 Ride Completed! AI Verification Passed (96.5% confidence). Trust Score +2.0'
        : '⚠️ Ride Completed! Drop-off out of hub boundary. Trust Score adjusted (-5.0 pts).'
    );
  };

  const usersList = [
    currentUser,
    { id: 2, name: 'Priya Patel', email: 'priya.p2025@iimbg.ac.in', role: 'student', trustScore: 92.0 },
    { id: 3, name: 'Campus Fleet Admin', email: 'admin@iimbg.ac.in', role: 'admin', trustScore: 100.0 }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      <main className="max-w-xl mx-auto px-3 pt-3">
        <Navbar
          currentUser={currentUser}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenAuth={() => setShowAuthModal(true)}
        />

        {activeTab === 'student' ? (
          <StudentView
            currentUser={currentUser}
            hubs={hubs}
            cycles={cycles}
            activeTrip={activeTrip}
            onStartTrip={handleStartTrip}
            onEndTrip={handleEndTrip}
            userLocation={userLocation}
          />
        ) : (
          <AdminView
            hubs={hubs}
            cycles={cycles}
            activeTrip={activeTrip}
            users={usersList}
          />
        )}
      </main>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={(user) => setCurrentUser(user)}
      />
    </div>
  );
}
