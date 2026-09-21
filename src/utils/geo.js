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

export {
  predictHubDemands,
  generateRebalancePlan,
  executeRebalancePlan
} from '../ai/demandForecaster';

