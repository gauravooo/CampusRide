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
