// Initial Seed Data for IIM Bodh Gaya CampusRide
// Synchronized with Admin-Configured Designated Campus Hubs (Cloudflare D1)

export const CAMPUS_HUBS = [
  { id: 1, name: "Main Gate", code: "HUB-MG", lat: 24.680029, lng: 84.963476, radius_meters: 25, capacity: 30, description: "Primary campus entrance & visitor check.", icon: "DoorOpen" },
  { id: 2, name: "Academic Block", code: "HUB-AB", lat: 24.680167, lng: 84.965313, radius_meters: 25, capacity: 100, description: "Main lecture halls & library.", icon: "BookOpen" },
  { id: 3, name: "Mess / Annapurna", code: "HUB-MS", lat: 24.680614, lng: 84.967928, radius_meters: 25, capacity: 50, description: "Central dining hall & cafeteria.", icon: "Utensils" },
  { id: 4, name: "Sports Complex / Udaan", code: "HUB-SC", lat: 24.680335, lng: 84.966544, radius_meters: 25, capacity: 25, description: "Gymnasium & badminton courts.", icon: "Activity" },
  { id: 5, name: "Tilak & Attri Hostel", code: "HUB-TA", lat: 24.680524, lng: 84.968459, radius_meters: 25, capacity: 25, description: "Hostels Tilak and Attri.", icon: "Home" },
  { id: 6, name: "Azad & Patel Hostel", code: "HUB-AP", lat: 24.681314, lng: 84.968851, radius_meters: 25, capacity: 25, description: "Residence blocks Azad and Patel.", icon: "Home" },
  { id: 7, name: "H9 Hostel", code: "HUB-HSTL", lat: 24.685926, lng: 84.968140, radius_meters: 25, capacity: 20, description: "Hostel H9 residence.", icon: "Building" },
  { id: 8, name: "Siang Hostel", code: "HUB-SB", lat: 24.683914, lng: 84.968275, radius_meters: 25, capacity: 80, description: "Siang student accommodation.", icon: "Home" },
  { id: 9, name: "Gargi Hostel", code: "HUB-GH", lat: 24.682639, lng: 84.968186, radius_meters: 25, capacity: 20, description: "Gargi hostel precinct.", icon: "Home" },
  { id: 10, name: "Aryabhatta Hostel", code: "HUB-AH", lat: 24.680674, lng: 84.967161, radius_meters: 25, capacity: 20, description: "Girls student residence.", icon: "Home" }
];

export const generateInitialCycles = () => {
  const cycles = [];
  const TOTAL_CYCLES = 200;
  const cyclesPerHub = Math.floor(TOTAL_CYCLES / CAMPUS_HUBS.length);

  let counter = 1;
  CAMPUS_HUBS.forEach((hub, i) => {
    const count = cyclesPerHub + (i < (TOTAL_CYCLES % CAMPUS_HUBS.length) ? 1 : 0);
    for (let c = 0; c < count; c++) {
      const code = `BG-CYCLE-${String(counter).padStart(3, '0')}`;
      const qrCode = `IIMBG-RIDE-${String(counter).padStart(3, '0')}`;
      const pin = String((1000 + counter * 137) % 9000 + 1000);
      const bleMac = `C0:26:BG:${(counter * 7 % 99).toString(16).padStart(2, '0').toUpperCase()}:${(counter * 13 % 99).toString(16).padStart(2, '0').toUpperCase()}:${(counter * 19 % 99).toString(16).padStart(2, '0').toUpperCase()}`;
      const battery = Math.floor(70 + (counter * 17) % 31);
      const status = (counter % 25 === 0) ? 'maintenance' : 'available';

      cycles.push({
        id: counter,
        code,
        qrCode,
        status,
        batteryPct: battery,
        lockPin: pin,
        bleMac,
        hubId: hub.id,
        lat: hub.lat + (Math.random() - 0.5) * 0.0003,
        lng: hub.lng + (Math.random() - 0.5) * 0.0003,
        totalTrips: 10 + (counter * 3) % 75
      });
      counter++;
    }
  });

  return cycles;
};

export const generateInitialTrips = () => {
  const now = Date.now();
  const daysAgo = (d, h = 0) => new Date(now - (d * 86400000 + h * 3600000)).toISOString();

  return [
    // 1. Recent Trips (< 60 days / within 2 months)
    {
      id: 101,
      userId: 1,
      userName: 'Aditya Verma',
      userEmail: 'aditya.v2025@iimbg.ac.in',
      cycleId: 1,
      cycleCode: 'BG-CYCLE-001',
      startHubId: 1,
      startHubName: 'Main Gate',
      endHubId: 2,
      endHubName: 'Academic Block',
      startTime: daysAgo(0, 3),
      endTime: daysAgo(0, 2),
      durationMinutes: 12.5,
      photoVerified: true,
      trustDelta: 2.0,
      withinGeofence: true,
      status: 'completed'
    },
    {
      id: 102,
      userId: 2,
      userName: 'Priya Patel',
      userEmail: 'priya.p2025@iimbg.ac.in',
      cycleId: 5,
      cycleCode: 'BG-CYCLE-005',
      startHubId: 5,
      startHubName: 'Tilak & Attri Hostel',
      endHubId: 3,
      endHubName: 'Mess / Annapurna',
      startTime: daysAgo(1, 5),
      endTime: daysAgo(1, 4),
      durationMinutes: 8.0,
      photoVerified: true,
      trustDelta: 2.0,
      withinGeofence: true,
      status: 'completed'
    },
    {
      id: 103,
      userId: 3,
      userName: 'Rohan Verma',
      userEmail: 'rohan.v2025@iimbg.ac.in',
      cycleId: 12,
      cycleCode: 'BG-CYCLE-012',
      startHubId: 8,
      startHubName: 'Siang Hostel',
      endHubId: 2,
      endHubName: 'Academic Block',
      startTime: daysAgo(3, 2),
      endTime: daysAgo(3, 1),
      durationMinutes: 15.2,
      photoVerified: true,
      trustDelta: 2.0,
      withinGeofence: true,
      status: 'completed'
    },
    {
      id: 104,
      userId: 4,
      userName: 'Sneha Mukherjee',
      userEmail: 'sneha.m2025@iimbg.ac.in',
      cycleId: 8,
      cycleCode: 'BG-CYCLE-008',
      startHubId: 1,
      startHubName: 'Main Gate',
      endHubId: 4,
      endHubName: 'Sports Complex / Udaan',
      startTime: daysAgo(7, 4),
      endTime: daysAgo(7, 3),
      durationMinutes: 18.0,
      photoVerified: true,
      trustDelta: 2.0,
      withinGeofence: true,
      status: 'completed'
    },
    {
      id: 105,
      userId: 6,
      userName: 'Nageen',
      userEmail: 'nageen@iimbg.ac.in',
      cycleId: 3,
      cycleCode: 'BG-CYCLE-003',
      startHubId: 2,
      startHubName: 'Academic Block',
      endHubId: 6,
      endHubName: 'Azad & Patel Hostel',
      startTime: daysAgo(14, 6),
      endTime: daysAgo(14, 5),
      durationMinutes: 9.5,
      photoVerified: true,
      trustDelta: 2.0,
      withinGeofence: true,
      status: 'completed'
    },
    {
      id: 106,
      userId: 1,
      userName: 'Aditya Verma',
      userEmail: 'aditya.v2025@iimbg.ac.in',
      cycleId: 15,
      cycleCode: 'BG-CYCLE-015',
      startHubId: 4,
      startHubName: 'Sports Complex / Udaan',
      endHubId: 3,
      endHubName: 'Mess / Annapurna',
      startTime: daysAgo(21, 1),
      endTime: daysAgo(21, 0),
      durationMinutes: 7.2,
      photoVerified: true,
      trustDelta: 2.0,
      withinGeofence: true,
      status: 'completed'
    },
    {
      id: 107,
      userId: 3,
      userName: 'Rohan Verma',
      userEmail: 'rohan.v2025@iimbg.ac.in',
      cycleId: 7,
      cycleCode: 'BG-CYCLE-007',
      startHubId: 10,
      startHubName: 'Aryabhatta Hostel',
      endHubId: 2,
      endHubName: 'Academic Block',
      startTime: daysAgo(35, 8),
      endTime: daysAgo(35, 7),
      durationMinutes: 14.0,
      photoVerified: true,
      trustDelta: 2.0,
      withinGeofence: true,
      status: 'completed'
    },
    {
      id: 108,
      userId: 2,
      userName: 'Priya Patel',
      userEmail: 'priya.p2025@iimbg.ac.in',
      cycleId: 19,
      cycleCode: 'BG-CYCLE-019',
      startHubId: 1,
      startHubName: 'Main Gate',
      endHubId: 9,
      endHubName: 'Gargi Hostel',
      startTime: daysAgo(48, 3),
      endTime: daysAgo(48, 2),
      durationMinutes: 11.5,
      photoVerified: true,
      trustDelta: 2.0,
      withinGeofence: true,
      status: 'completed'
    },

    // 2. Archived Trips (> 60 days / 2+ months old)
    {
      id: 201,
      userId: 1,
      userName: 'Aditya Verma',
      userEmail: 'aditya.v2025@iimbg.ac.in',
      cycleId: 2,
      cycleCode: 'BG-CYCLE-002',
      startHubId: 1,
      startHubName: 'Main Gate',
      endHubId: 2,
      endHubName: 'Academic Block',
      startTime: daysAgo(64, 4),
      endTime: daysAgo(64, 3),
      durationMinutes: 13.0,
      photoVerified: true,
      trustDelta: 2.0,
      withinGeofence: true,
      status: 'archived'
    },
    {
      id: 202,
      userId: 4,
      userName: 'Sneha Mukherjee',
      userEmail: 'sneha.m2025@iimbg.ac.in',
      cycleId: 10,
      cycleCode: 'BG-CYCLE-010',
      startHubId: 6,
      startHubName: 'Azad & Patel Hostel',
      endHubId: 3,
      endHubName: 'Mess / Annapurna',
      startTime: daysAgo(72, 2),
      endTime: daysAgo(72, 1),
      durationMinutes: 9.0,
      photoVerified: true,
      trustDelta: 2.0,
      withinGeofence: true,
      status: 'archived'
    },
    {
      id: 203,
      userId: 3,
      userName: 'Rohan Verma',
      userEmail: 'rohan.v2025@iimbg.ac.in',
      cycleId: 6,
      cycleCode: 'BG-CYCLE-006',
      startHubId: 8,
      startHubName: 'Siang Hostel',
      endHubId: 2,
      endHubName: 'Academic Block',
      startTime: daysAgo(85, 5),
      endTime: daysAgo(85, 4),
      durationMinutes: 16.5,
      photoVerified: true,
      trustDelta: 2.0,
      withinGeofence: true,
      status: 'archived'
    },
    {
      id: 204,
      userId: 2,
      userName: 'Priya Patel',
      userEmail: 'priya.p2025@iimbg.ac.in',
      cycleId: 14,
      cycleCode: 'BG-CYCLE-014',
      startHubId: 2,
      startHubName: 'Academic Block',
      endHubId: 1,
      endHubName: 'Main Gate',
      startTime: daysAgo(95, 2),
      endTime: daysAgo(95, 1),
      durationMinutes: 12.0,
      photoVerified: true,
      trustDelta: 2.0,
      withinGeofence: true,
      status: 'archived'
    },
    {
      id: 205,
      userId: 5,
      userName: 'Campus Fleet Admin',
      userEmail: 'admin@iimbg.ac.in',
      cycleId: 20,
      cycleCode: 'BG-CYCLE-020',
      startHubId: 1,
      startHubName: 'Main Gate',
      endHubId: 4,
      endHubName: 'Sports Complex / Udaan',
      startTime: daysAgo(110, 6),
      endTime: daysAgo(110, 5),
      durationMinutes: 22.0,
      photoVerified: true,
      trustDelta: 2.0,
      withinGeofence: true,
      status: 'archived'
    },
    {
      id: 206,
      userId: 1,
      userName: 'Aditya Verma',
      userEmail: 'aditya.v2025@iimbg.ac.in',
      cycleId: 1,
      cycleCode: 'BG-CYCLE-001',
      startHubId: 7,
      startHubName: 'H9 Hostel',
      endHubId: 2,
      endHubName: 'Academic Block',
      startTime: daysAgo(120, 3),
      endTime: daysAgo(120, 2),
      durationMinutes: 10.5,
      photoVerified: true,
      trustDelta: 2.0,
      withinGeofence: true,
      status: 'archived'
    }
  ];
};
