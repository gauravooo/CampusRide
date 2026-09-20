// Haversine Geospatial Distance Calculation

const EARTH_RADIUS_METERS = 6371000.0;

export function haversineDistance(lat1, lng1, lat2, lng2) {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2.0) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2.0) ** 2;
  const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));

  return Math.round(EARTH_RADIUS_METERS * c * 10) / 10;
}

export function findNearestHub(userLat, userLng, hubs) {
  if (!Array.isArray(hubs) || hubs.length === 0) return { nearestHub: null, distanceMeters: Infinity };

  let nearestHub = null;
  let minDistance = Infinity;

  hubs.forEach((hub) => {
    const dist = haversineDistance(userLat, userLng, hub.lat, hub.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearestHub = hub;
    }
  });

  return { nearestHub, distanceMeters: minDistance };
}

export function predictHubDemands(hubs, cycles) {
  if (!Array.isArray(hubs) || hubs.length === 0) return [];
  const safeCycles = Array.isArray(cycles) ? cycles : [];

  const now = new Date();
  const hour = now.getHours();
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;

  return hubs.map((hub) => {
    const currentCount = safeCycles.filter(
      (c) => c.hubId === hub.id && c.status === 'available'
    ).length;

    // Simulated RandomForest predictor logic based on time of day & hub type
    let demandRatio = 0.35;
    if (hub.id === 2 && hour >= 8 && hour <= 17 && !isWeekend) demandRatio = 0.85; // Academic Block
    else if (hub.id === 3 && [8, 9, 13, 14, 20, 21].includes(hour)) demandRatio = 0.90; // Mess
    else if ([5, 6, 7, 8, 9, 10].includes(hub.id) && (hour >= 21 || hour <= 8)) demandRatio = 0.75; // Hostels
    else if (hub.id === 4 && hour >= 17 && hour <= 20) demandRatio = 0.80; // Sports complex

    const predictedDemand = Math.round(demandRatio * hub.capacity);
    const deficit = Math.max(0, predictedDemand - currentCount);

    let severity = 'low';
    if (deficit >= 6) severity = 'critical';
    else if (deficit >= 4) severity = 'high';
    else if (deficit >= 2) severity = 'medium';

    const recommendedAction =
      deficit > 0
        ? `Rebalance Alert: Move +${deficit} cycles to ${hub.name} to meet expected peak demand.`
        : 'Optimal fleet distribution.';

    return {
      hubId: hub.id,
      hubName: hub.name,
      capacity: hub.capacity,
      currentCount,
      predictedDemand,
      deficit,
      severity,
      recommendedAction,
    };
  }).sort((a, b) => b.deficit - a.deficit);
}
