// Unified API Service for CampusRide
// Connects to Cloudflare D1 Serverless SQL API with seamless LocalStorage / Offline PWA fallback

import { CAMPUS_HUBS } from '../data/initialData';

const INITIAL_USERS = [
  { id: 1, name: 'Aarav Sharma', email: 'aarav.s2025@iimbg.ac.in', role: 'student', trustScore: 98.5 },
  { id: 2, name: 'Priya Patel', email: 'priya.p2025@iimbg.ac.in', role: 'student', trustScore: 92.0 },
  { id: 3, name: 'Rohan Verma', email: 'rohan.v2025@iimbg.ac.in', role: 'student', trustScore: 100.0 },
  { id: 4, name: 'Sneha Mukherjee', email: 'sneha.m2025@iimbg.ac.in', role: 'student', trustScore: 88.0 },
  { id: 5, name: 'Campus Fleet Admin', email: 'admin@iimbg.ac.in', role: 'admin', trustScore: 100.0 }
];

export const api = {
  // 1. Users & Trust Scores
  async getUsers() {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const normalized = data.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            trustScore: typeof u.trust_score === 'number' ? u.trust_score : (u.trustScore || 100.0)
          }));
          localStorage.setItem('campus_users_cache', JSON.stringify(normalized));
          return normalized;
        }
      }
    } catch (e) {
      console.warn('[API] Using local cached users fallback:', e.message);
    }

    const cached = localStorage.getItem('campus_users_cache');
    return cached ? JSON.parse(cached) : INITIAL_USERS;
  },

  async adjustTrustScore(userId, newScore, reason = '') {
    const clampedScore = Math.min(100.0, Math.max(0.0, parseFloat(newScore)));
    try {
      await fetch('/api/users?action=adjust-trust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newScore: clampedScore, reason })
      });
    } catch (e) {
      console.warn('[API] Trust adjustment saved locally:', e.message);
    }

    // Update local cache
    const current = await this.getUsers();
    const updated = current.map((u) => (u.id === userId ? { ...u, trustScore: clampedScore } : u));
    localStorage.setItem('campus_users_cache', JSON.stringify(updated));
    return updated;
  },

  async loginUser(email, name, picture = '') {
    const trimmedEmail = email.trim().toLowerCase();
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, name, picture })
      });
      if (res.ok) {
        const user = await res.json();
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          trustScore: typeof user.trust_score === 'number' ? user.trust_score : (user.trustScore || 100.0),
          picture: user.picture || picture
        };
      }
    } catch (e) {
      console.warn('[API] Login fallback to local storage:', e.message);
    }

    const role = trimmedEmail.startsWith('admin@') ? 'admin' : 'student';
    return {
      id: Date.now(),
      name: name || trimmedEmail.split('@')[0],
      email: trimmedEmail,
      role,
      trustScore: 100.0,
      picture
    };
  },

  // 2. Designated Campus Pickup & Drop Hubs
  async getHubs() {
    try {
      const res = await fetch('/api/hubs');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const normalized = data.map((h) => ({
            id: h.id,
            name: h.name,
            code: h.code,
            lat: parseFloat(h.lat),
            lng: parseFloat(h.lng),
            radius_meters: parseFloat(h.radius_meters) || 25.0,
            capacity: parseInt(h.capacity) || 25,
            description: h.description || '',
            icon: h.icon || 'MapPin'
          }));
          localStorage.setItem('campus_hubs_cache', JSON.stringify(normalized));
          return normalized;
        }
      }
    } catch (e) {
      console.warn('[API] Using local cached hubs fallback:', e.message);
    }

    const cached = localStorage.getItem('campus_hubs_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return CAMPUS_HUBS;
  },

  async saveHub(hub) {
    const isNew = !hub.id;
    let savedHub = null;

    try {
      const res = await fetch('/api/hubs', {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hub)
      });
      if (res.ok) {
        savedHub = await res.json();
      }
    } catch (e) {
      console.warn('[API] Hub saved locally:', e.message);
    }

    // Merge saved hub into the full list of hubs
    const current = await this.getHubs();
    const effectiveHub = savedHub && savedHub.id ? savedHub : hub;
    let updated;

    if (isNew) {
      const newId = effectiveHub.id || Date.now();
      updated = [...current, { ...effectiveHub, id: newId }];
    } else {
      updated = current.map((h) => (h.id === effectiveHub.id ? { ...h, ...effectiveHub } : h));
    }

    const normalized = updated.map((h) => ({
      id: h.id,
      name: h.name,
      code: h.code,
      lat: parseFloat(h.lat),
      lng: parseFloat(h.lng),
      radius_meters: parseFloat(h.radius_meters) || 25.0,
      capacity: parseInt(h.capacity) || 25,
      description: h.description || '',
      icon: h.icon || 'MapPin'
    }));

    localStorage.setItem('campus_hubs_cache', JSON.stringify(normalized));
    return normalized;
  },

  async deleteHub(hubId) {
    try {
      await fetch(`/api/hubs?id=${hubId}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('[API] Hub deleted locally:', e.message);
    }

    const current = await this.getHubs();
    const updated = current.filter((h) => h.id !== hubId);
    localStorage.setItem('campus_hubs_cache', JSON.stringify(updated));
    return updated;
  }
};
