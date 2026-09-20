// Cloudflare Pages Function: /api/trips
// Manages Ride History, Telemetry, and Two-Month Archival inside Cloudflare D1 SQL database (env.DB)

function getSeedTrips() {
  const now = Date.now();
  const daysAgo = (d, h = 0) => new Date(now - (d * 86400000 + h * 3600000)).toISOString();

  return [
    // 1. Recent Trips (< 60 days old)
    {
      id: 101,
      user_id: 1,
      user_name: 'Aarav Sharma',
      user_email: 'aarav.s2025@iimbg.ac.in',
      cycle_id: 1,
      cycle_code: 'BG-CYCLE-001',
      start_hub_id: 1,
      start_hub_name: 'Main Gate',
      end_hub_id: 2,
      end_hub_name: 'Academic Block',
      start_time: daysAgo(0, 3),
      end_time: daysAgo(0, 2),
      duration_minutes: 12.5,
      photo_verified: 1,
      trust_score_delta: 2.0,
      within_geofence: 1,
      status: 'completed'
    },
    {
      id: 102,
      user_id: 2,
      user_name: 'Priya Patel',
      user_email: 'priya.p2025@iimbg.ac.in',
      cycle_id: 5,
      cycle_code: 'BG-CYCLE-005',
      start_hub_id: 5,
      start_hub_name: 'Tilak & Attri Hostel',
      end_hub_id: 3,
      end_hub_name: 'Mess / Annapurna',
      start_time: daysAgo(1, 5),
      end_time: daysAgo(1, 4),
      duration_minutes: 8.0,
      photo_verified: 1,
      trust_score_delta: 2.0,
      within_geofence: 1,
      status: 'completed'
    },
    {
      id: 103,
      user_id: 3,
      user_name: 'Rohan Verma',
      user_email: 'rohan.v2025@iimbg.ac.in',
      cycle_id: 12,
      cycle_code: 'BG-CYCLE-012',
      start_hub_id: 8,
      start_hub_name: 'Siang Hostel',
      end_hub_id: 2,
      end_hub_name: 'Academic Block',
      start_time: daysAgo(3, 2),
      end_time: daysAgo(3, 1),
      duration_minutes: 15.2,
      photo_verified: 1,
      trust_score_delta: 2.0,
      within_geofence: 1,
      status: 'completed'
    },
    {
      id: 104,
      user_id: 4,
      user_name: 'Sneha Mukherjee',
      user_email: 'sneha.m2025@iimbg.ac.in',
      cycle_id: 8,
      cycle_code: 'BG-CYCLE-008',
      start_hub_id: 1,
      start_hub_name: 'Main Gate',
      end_hub_id: 4,
      end_hub_name: 'Sports Complex / Udaan',
      start_time: daysAgo(7, 4),
      end_time: daysAgo(7, 3),
      duration_minutes: 18.0,
      photo_verified: 1,
      trust_score_delta: 2.0,
      within_geofence: 1,
      status: 'completed'
    },
    {
      id: 105,
      user_id: 6,
      user_name: 'Nageen',
      user_email: 'nageen@iimbg.ac.in',
      cycle_id: 3,
      cycle_code: 'BG-CYCLE-003',
      start_hub_id: 2,
      start_hub_name: 'Academic Block',
      end_hub_id: 6,
      end_hub_name: 'Azad & Patel Hostel',
      start_time: daysAgo(14, 6),
      end_time: daysAgo(14, 5),
      duration_minutes: 9.5,
      photo_verified: 1,
      trust_score_delta: 2.0,
      within_geofence: 1,
      status: 'completed'
    },
    {
      id: 106,
      user_id: 1,
      user_name: 'Aarav Sharma',
      user_email: 'aarav.s2025@iimbg.ac.in',
      cycle_id: 15,
      cycle_code: 'BG-CYCLE-015',
      start_hub_id: 4,
      start_hub_name: 'Sports Complex / Udaan',
      end_hub_id: 3,
      end_hub_name: 'Mess / Annapurna',
      start_time: daysAgo(21, 1),
      end_time: daysAgo(21, 0),
      duration_minutes: 7.2,
      photo_verified: 1,
      trust_score_delta: 2.0,
      within_geofence: 1,
      status: 'completed'
    },
    {
      id: 107,
      user_id: 3,
      user_name: 'Rohan Verma',
      user_email: 'rohan.v2025@iimbg.ac.in',
      cycle_id: 7,
      cycle_code: 'BG-CYCLE-007',
      start_hub_id: 10,
      start_hub_name: 'Aryabhatta Hostel',
      end_hub_id: 2,
      end_hub_name: 'Academic Block',
      start_time: daysAgo(35, 8),
      end_time: daysAgo(35, 7),
      duration_minutes: 14.0,
      photo_verified: 1,
      trust_score_delta: 2.0,
      within_geofence: 1,
      status: 'completed'
    },
    {
      id: 108,
      user_id: 2,
      user_name: 'Priya Patel',
      user_email: 'priya.p2025@iimbg.ac.in',
      cycle_id: 19,
      cycle_code: 'BG-CYCLE-019',
      start_hub_id: 1,
      start_hub_name: 'Main Gate',
      end_hub_id: 9,
      end_hub_name: 'Gargi Hostel',
      start_time: daysAgo(48, 3),
      end_time: daysAgo(48, 2),
      duration_minutes: 11.5,
      photo_verified: 1,
      trust_score_delta: 2.0,
      within_geofence: 1,
      status: 'completed'
    },

    // 2. Archived Trips (> 60 days / 2+ months old)
    {
      id: 201,
      user_id: 1,
      user_name: 'Aarav Sharma',
      user_email: 'aarav.s2025@iimbg.ac.in',
      cycle_id: 2,
      cycle_code: 'BG-CYCLE-002',
      start_hub_id: 1,
      start_hub_name: 'Main Gate',
      end_hub_id: 2,
      end_hub_name: 'Academic Block',
      start_time: daysAgo(64, 4),
      end_time: daysAgo(64, 3),
      duration_minutes: 13.0,
      photo_verified: 1,
      trust_score_delta: 2.0,
      within_geofence: 1,
      status: 'archived'
    },
    {
      id: 202,
      user_id: 4,
      user_name: 'Sneha Mukherjee',
      user_email: 'sneha.m2025@iimbg.ac.in',
      cycle_id: 10,
      cycle_code: 'BG-CYCLE-010',
      start_hub_id: 6,
      start_hub_name: 'Azad & Patel Hostel',
      end_hub_id: 3,
      end_hub_name: 'Mess / Annapurna',
      start_time: daysAgo(72, 2),
      end_time: daysAgo(72, 1),
      duration_minutes: 9.0,
      photo_verified: 1,
      trust_score_delta: 2.0,
      within_geofence: 1,
      status: 'archived'
    },
    {
      id: 203,
      user_id: 3,
      user_name: 'Rohan Verma',
      user_email: 'rohan.v2025@iimbg.ac.in',
      cycle_id: 6,
      cycle_code: 'BG-CYCLE-006',
      start_hub_id: 8,
      start_hub_name: 'Siang Hostel',
      end_hub_id: 2,
      end_hub_name: 'Academic Block',
      start_time: daysAgo(85, 5),
      end_time: daysAgo(85, 4),
      duration_minutes: 16.5,
      photo_verified: 1,
      trust_score_delta: 2.0,
      within_geofence: 1,
      status: 'archived'
    },
    {
      id: 204,
      user_id: 2,
      user_name: 'Priya Patel',
      user_email: 'priya.p2025@iimbg.ac.in',
      cycle_id: 14,
      cycle_code: 'BG-CYCLE-014',
      start_hub_id: 2,
      start_hub_name: 'Academic Block',
      end_hub_id: 1,
      end_hub_name: 'Main Gate',
      start_time: daysAgo(95, 2),
      end_time: daysAgo(95, 1),
      duration_minutes: 12.0,
      photo_verified: 1,
      trust_score_delta: 2.0,
      within_geofence: 1,
      status: 'archived'
    },
    {
      id: 205,
      user_id: 5,
      user_name: 'Campus Fleet Admin',
      user_email: 'admin@iimbg.ac.in',
      cycle_id: 20,
      cycle_code: 'BG-CYCLE-020',
      start_hub_id: 1,
      start_hub_name: 'Main Gate',
      end_hub_id: 4,
      end_hub_name: 'Sports Complex / Udaan',
      start_time: daysAgo(110, 6),
      end_time: daysAgo(110, 5),
      duration_minutes: 22.0,
      photo_verified: 1,
      trust_score_delta: 2.0,
      within_geofence: 1,
      status: 'archived'
    },
    {
      id: 206,
      user_id: 1,
      user_name: 'Aarav Sharma',
      user_email: 'aarav.s2025@iimbg.ac.in',
      cycle_id: 1,
      cycle_code: 'BG-CYCLE-001',
      start_hub_id: 7,
      start_hub_name: 'H9 Hostel',
      end_hub_id: 2,
      end_hub_name: 'Academic Block',
      start_time: daysAgo(120, 3),
      end_time: daysAgo(120, 2),
      duration_minutes: 10.5,
      photo_verified: 1,
      trust_score_delta: 2.0,
      within_geofence: 1,
      status: 'archived'
    }
  ];
}

export async function onRequestGet(context) {
  const { env } = context;

  if (env && env.DB) {
    try {
      const { results } = await env.DB.prepare(
        'SELECT * FROM trips ORDER BY start_time DESC'
      ).all();

      if (results && results.length > 0) {
        return new Response(JSON.stringify(results), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (err) {
      console.error('[D1 Trips GET Error]', err);
    }
  }

  // Fallback initial trips seed
  return new Response(JSON.stringify(getSeedTrips()), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const trip = await request.json();
    const userId = trip.userId || trip.user_id || 1;
    const userName = trip.userName || trip.user_name || 'Campus Student';
    const userEmail = trip.userEmail || trip.user_email || 'student@iimbg.ac.in';
    const cycleId = trip.cycleId || trip.cycle_id || 1;
    const cycleCode = trip.cycleCode || trip.cycle_code || 'BG-CYCLE-001';
    const startHubId = trip.startHubId || trip.start_hub_id || 1;
    const startHubName = trip.startHubName || trip.start_hub_name || 'Main Gate';
    const endHubId = trip.endHubId || trip.end_hub_id || 1;
    const endHubName = trip.endHubName || trip.end_hub_name || 'Academic Block';
    const startTime = trip.startTime || trip.start_time || new Date().toISOString();
    const endTime = trip.endTime || trip.end_time || new Date().toISOString();
    const durationMinutes = parseFloat(trip.durationMinutes || trip.duration_minutes) || 5.0;
    const photoVerified = trip.photoVerified ? 1 : 0;
    const trustScoreDelta = parseFloat(trip.trustScoreDelta || trip.trust_score_delta) || 0.0;
    const withinGeofence = trip.withinGeofence ? 1 : 0;
    const status = trip.status || 'completed';

    const newTrip = {
      id: Date.now(),
      user_id: userId,
      user_name: userName,
      user_email: userEmail,
      cycle_id: cycleId,
      cycle_code: cycleCode,
      start_hub_id: startHubId,
      start_hub_name: startHubName,
      end_hub_id: endHubId,
      end_hub_name: endHubName,
      start_time: startTime,
      end_time: endTime,
      duration_minutes: durationMinutes,
      photo_verified: photoVerified,
      trust_score_delta: trustScoreDelta,
      within_geofence: withinGeofence,
      status
    };

    if (env && env.DB) {
      try {
        await env.DB.prepare(`
          INSERT INTO trips (user_id, cycle_id, cycle_code, start_hub_id, end_hub_id, start_time, end_time, duration_minutes, photo_verified, trust_score_delta, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          userId, cycleId, cycleCode, startHubId, endHubId, startTime, endTime, durationMinutes, photoVerified, trustScoreDelta, status
        ).run();
      } catch (dbErr) {
        console.warn('[D1 Trips Insert Warning]', dbErr.message);
      }
    }

    return new Response(JSON.stringify(newTrip), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
