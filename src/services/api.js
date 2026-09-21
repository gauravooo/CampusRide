// Unified API Service for CampusRide
// Connects to Cloudflare D1 Serverless SQL API with seamless LocalStorage / Offline PWA fallback

import { CAMPUS_HUBS, generateInitialTrips } from '../data/initialData';

const INITIAL_USERS = [
  { id: 1, name: 'Aditya Verma', email: 'aditya.v2025@iimbg.ac.in', role: 'student', trustScore: 98.5 },
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
  },

  // 3. Rides, Telemetry & Two-Month Archival
  async getTrips() {
    // 1. Read existing cached trips from localStorage to preserve full metadata
    let localCache = [];
    const cached = localStorage.getItem('campus_trips_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localCache = parsed;
        }
      } catch (e) {}
    }

    // 2. Fetch remote trips from D1
    let remoteData = null;
    try {
      const res = await fetch('/api/trips');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          remoteData = data;
        }
      }
    } catch (e) {
      console.warn('[API] Using local cached trips fallback:', e.message);
    }

    // If no remote data, use local cache or fallback seed
    if (!remoteData || remoteData.length === 0) {
      return localCache.length > 0 ? localCache : generateInitialTrips();
    }

    // 3. Normalize remote data, enriching each record from localCache, INITIAL_USERS, and CAMPUS_HUBS
    const normalized = remoteData.map((t) => {
      const tId = String(t.id);
      const cachedMatch = localCache.find(
        (c) =>
          String(c.id) === tId ||
          (c.cycleCode === (t.cycle_code || t.cycleCode) &&
            Math.abs(new Date(c.startTime).getTime() - new Date(t.start_time || t.startTime).getTime()) < 5000)
      );

      const userId = t.user_id || t.userId || cachedMatch?.userId || 1;
      const matchedUser = INITIAL_USERS.find((u) => String(u.id) === String(userId));
      const startHubId = t.start_hub_id || t.startHubId || cachedMatch?.startHubId || 1;
      const endHubId = t.end_hub_id || t.endHubId || cachedMatch?.endHubId || 2;
      const matchedStartHub = CAMPUS_HUBS.find((h) => String(h.id) === String(startHubId));
      const matchedEndHub = CAMPUS_HUBS.find((h) => String(h.id) === String(endHubId));

      const rawTrustDelta = t.trust_score_delta ?? t.trustDelta;
      const trustDelta = typeof rawTrustDelta === 'number'
        ? rawTrustDelta
        : (typeof cachedMatch?.trustDelta === 'number' ? cachedMatch.trustDelta : 2.0);

      const withinGeofence =
        (t.within_geofence !== undefined && t.within_geofence !== null)
          ? Boolean(t.within_geofence)
          : (t.withinGeofence !== undefined && t.withinGeofence !== null
              ? Boolean(t.withinGeofence)
              : (cachedMatch?.withinGeofence !== undefined
                  ? Boolean(cachedMatch.withinGeofence)
                  : trustDelta >= 0));

      const rawUserName = t.user_name || t.userName;
      const userName =
        (rawUserName && rawUserName !== 'Campus Student')
          ? rawUserName
          : (cachedMatch?.userName || matchedUser?.name || 'Campus Rider');

      const rawUserEmail = t.user_email || t.userEmail;
      const userEmail =
        (rawUserEmail && rawUserEmail !== 'student@iimbg.ac.in' && rawUserEmail !== '')
          ? rawUserEmail
          : (cachedMatch?.userEmail || matchedUser?.email || 'student@iimbg.ac.in');

      const rawStartHub = t.start_hub_name || t.startHubName;
      const startHubName =
        (rawStartHub && rawStartHub !== 'Campus Hub')
          ? rawStartHub
          : (cachedMatch?.startHubName || matchedStartHub?.name || 'Main Gate');

      const rawEndHub = t.end_hub_name || t.endHubName;
      const isTripActive = (t.status === 'in_progress' || t.status === 'active' || (!t.end_time && !t.endTime));
      const endHubName = isTripActive
        ? 'In Transit (Campus)'
        : ((rawEndHub && rawEndHub !== 'Campus Hub')
            ? rawEndHub
            : (cachedMatch?.endHubName || matchedEndHub?.name || 'Academic Block'));

      let durationMinutes = 0.0;
      if (isTripActive) {
        const startMs = new Date(t.start_time || t.startTime || cachedMatch?.startTime || Date.now()).getTime();
        durationMinutes = Math.max(0.5, Math.round(((Date.now() - startMs) / 60000) * 10) / 10);
      } else {
        durationMinutes = parseFloat(t.duration_minutes || t.durationMinutes || cachedMatch?.durationMinutes) || 5.0;
      }

      return {
        id: t.id || cachedMatch?.id || Date.now(),
        userId,
        userName,
        userEmail,
        cycleId: t.cycle_id || t.cycleId || cachedMatch?.cycleId || 1,
        cycleCode: t.cycle_code || t.cycleCode || cachedMatch?.cycleCode || 'BG-CYCLE-001',
        startHubId,
        startHubName,
        endHubId: isTripActive ? null : endHubId,
        endHubName,
        startTime: t.start_time || t.startTime || cachedMatch?.startTime || new Date().toISOString(),
        endTime: isTripActive ? null : (t.end_time || t.endTime || cachedMatch?.endTime || new Date().toISOString()),
        durationMinutes,
        photoVerified: isTripActive ? false : Boolean(t.photo_verified ?? t.photoVerified ?? cachedMatch?.photoVerified ?? true),
        photoUrl: t.photo_url || t.photoUrl || cachedMatch?.photoUrl || null,
        trustDelta: isTripActive ? 0.0 : trustDelta,
        withinGeofence: isTripActive ? true : withinGeofence,
        status: isTripActive ? 'in_progress' : (t.status || cachedMatch?.status || 'completed')
      };
    });

    // Also include any local-only trips that haven't synced to remote yet
    const remoteIds = new Set(normalized.map((n) => String(n.id)));
    const localOnly = localCache.filter((l) => !remoteIds.has(String(l.id)));
    const combined = [...localOnly, ...normalized];

    // Sort decreasing by end time, keeping active in-progress trips at the top
    combined.sort((a, b) => {
      const isAActive = a.status === 'in_progress' || a.status === 'active' || (!a.endTime && !a.end_time);
      const isBActive = b.status === 'in_progress' || b.status === 'active' || (!b.endTime && !b.end_time);

      if (isAActive && !isBActive) return -1;
      if (!isAActive && isBActive) return 1;

      if (isAActive && isBActive) {
        return new Date(b.startTime || b.start_time || 0).getTime() - new Date(a.startTime || a.start_time || 0).getTime();
      }

      const endA = new Date(a.endTime || a.end_time || a.startTime || a.start_time || 0).getTime();
      const endB = new Date(b.endTime || b.end_time || b.startTime || b.start_time || 0).getTime();
      return endB - endA;
    });

    localStorage.setItem('campus_trips_cache', JSON.stringify(combined));
    return combined;
  },

  async saveTrip(trip) {
    let savedTrip = null;
    const payload = {
      ...trip,
      photo_url: trip.photoUrl || trip.photo_url || null,
      photoUrl: trip.photoUrl || trip.photo_url || null
    };

    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        savedTrip = await res.json();
      }
    } catch (e) {
      console.warn('[API] Trip saved locally:', e.message);
    }

    const current = await this.getTrips();
    const isTripActive = (trip.status === 'in_progress' || trip.status === 'active' || (!trip.endTime && !trip.end_time));
    const normalizedNew = {
      id: savedTrip?.id || trip.id || Date.now(),
      userId: trip.userId || trip.user_id || 1,
      userName: trip.userName || trip.user_name || 'Campus Rider',
      userEmail: trip.userEmail || trip.user_email || 'student@iimbg.ac.in',
      cycleId: trip.cycleId || trip.cycle_id || 1,
      cycleCode: trip.cycleCode || trip.cycle_code || 'BG-CYCLE-001',
      startHubId: trip.startHubId || trip.start_hub_id || 1,
      startHubName: trip.startHubName || trip.start_hub_name || 'Main Gate',
      endHubId: isTripActive ? null : (trip.endHubId || trip.end_hub_id || 2),
      endHubName: isTripActive ? 'In Transit (Campus)' : (trip.endHubName || trip.end_hub_name || 'Academic Block'),
      startTime: trip.startTime || trip.start_time || new Date().toISOString(),
      endTime: isTripActive ? null : (trip.endTime || trip.end_time || new Date().toISOString()),
      durationMinutes: isTripActive ? 0.0 : (parseFloat(trip.durationMinutes || trip.duration_minutes) || 5.0),
      photoVerified: isTripActive ? false : Boolean(trip.photoVerified ?? trip.photo_verified),
      photoUrl: savedTrip?.photo_url || savedTrip?.photoUrl || trip.photoUrl || trip.photo_url || null,
      trustDelta: isTripActive ? 0.0 : (typeof trip.trustDelta === 'number'
        ? trip.trustDelta
        : (typeof trip.trustScoreDelta === 'number' ? trip.trustScoreDelta : (trip.withinGeofence ? 2.0 : -5.0))),
      withinGeofence: trip.withinGeofence !== undefined
        ? Boolean(trip.withinGeofence)
        : (parseFloat(trip.trustDelta ?? trip.trustScoreDelta) >= 0),
      status: isTripActive ? 'in_progress' : (trip.status || 'completed')
    };

    // Deduplicate so exact same trip or in-progress version is replaced cleanly
    const filtered = current.filter((t) => {
      if (String(t.id) === String(normalizedNew.id)) return false;
      if (
        t.cycleCode === normalizedNew.cycleCode &&
        (t.status === 'in_progress' || Math.abs(new Date(t.startTime).getTime() - new Date(normalizedNew.startTime).getTime()) < 60000)
      ) {
        return false;
      }
      return true;
    });

    const updated = [normalizedNew, ...filtered];
    updated.sort((a, b) => {
      const isAActive = a.status === 'in_progress' || a.status === 'active' || (!a.endTime && !a.end_time);
      const isBActive = b.status === 'in_progress' || b.status === 'active' || (!b.endTime && !b.end_time);

      if (isAActive && !isBActive) return -1;
      if (!isAActive && isBActive) return 1;

      if (isAActive && isBActive) {
        return new Date(b.startTime || b.start_time || 0).getTime() - new Date(a.startTime || a.start_time || 0).getTime();
      }

      const endA = new Date(a.endTime || a.end_time || a.startTime || a.start_time || 0).getTime();
      const endB = new Date(b.endTime || b.end_time || b.startTime || b.start_time || 0).getTime();
      return endB - endA;
    });

    localStorage.setItem('campus_trips_cache', JSON.stringify(updated));
    return updated;
  }
};
