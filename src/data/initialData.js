// Initial Seed Data for IIM Bodh Gaya CampusRide

export const CAMPUS_HUBS = [
  { id: 1, name: "Main Gate", code: "HUB-MG", lat: 24.6985, lng: 84.9855, capacity: 30, description: "Primary campus entrance & visitor check.", icon: "DoorOpen" },
  { id: 2, name: "Academic Block", code: "HUB-AB", lat: 24.6965, lng: 84.9875, capacity: 40, description: "Main lecture halls & library.", icon: "BookOpen" },
  { id: 3, name: "Mess / Annapurna", code: "HUB-MS", lat: 24.6955, lng: 84.9865, capacity: 30, description: "Central dining hall & cafeteria.", icon: "Utensils" },
  { id: 4, name: "Sports Complex / Udaan", code: "HUB-SC", lat: 24.6945, lng: 84.9880, capacity: 25, description: "Gymnasium & badminton courts.", icon: "Activity" },
  { id: 5, name: "H1 & H2 Hostel", code: "HUB-H1H2", lat: 24.6970, lng: 84.9890, capacity: 25, description: "Residence blocks H1 and H2.", icon: "Home" },
  { id: 6, name: "H3 & H4 Hostel", code: "HUB-H3H4", lat: 24.6960, lng: 84.9895, capacity: 25, description: "Residence blocks H3 and H4.", icon: "Home" },
  { id: 7, name: "Hostel Block", code: "HUB-HSTL", lat: 24.6950, lng: 84.9900, capacity: 20, description: "Executive residence.", icon: "Building" },
  { id: 8, name: "Siang + Bose Hostel", code: "HUB-SB", lat: 24.6940, lng: 84.9890, capacity: 20, description: "Siang and Bose student accommodation.", icon: "Home" },
  { id: 9, name: "Gargi Hostel", code: "HUB-GH", lat: 24.6935, lng: 84.9875, capacity: 20, description: "Gargi women's hostel precinct.", icon: "Home" },
  { id: 10, name: "Aryabhatta Hostel", code: "HUB-AH", lat: 24.6975, lng: 84.9880, capacity: 20, description: "Post-graduate student residence.", icon: "Home" }
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
        lat: hub.lat + (Math.random() - 0.5) * 0.0004,
        lng: hub.lng + (Math.random() - 0.5) * 0.0004,
        totalTrips: 10 + (counter * 3) % 75
      });
      counter++;
    }
  });

  return cycles;
};
