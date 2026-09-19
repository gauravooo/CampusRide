import math

EARTH_RADIUS_METERS = 6371000.0  # Earth radius in meters

def haversine_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calculate the great-circle distance between two points on the Earth in meters
    using the Haversine formula.
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    distance = EARTH_RADIUS_METERS * c
    return round(distance, 2)

def is_within_geofence(user_lat: float, user_lng: float, hub_lat: float, hub_lng: float, radius_meters: float = 60.0) -> tuple[bool, float]:
    """
    Returns (True, distance_meters) if (user_lat, user_lng) is within radius_meters of (hub_lat, hub_lng).
    """
    dist = haversine_distance(user_lat, user_lng, hub_lat, hub_lng)
    return (dist <= radius_meters, dist)

def find_nearest_hub(user_lat: float, user_lng: float, hubs: list) -> tuple[dict | None, float]:
    """
    Finds the nearest hub from a list of Hub dicts/objects.
    Returns (nearest_hub, distance_in_meters).
    """
    if not hubs:
        return (None, float('inf'))

    nearest = None
    min_dist = float('inf')

    for hub in hubs:
        h_lat = getattr(hub, 'latitude', hub.get('latitude') if isinstance(hub, dict) else None)
        h_lng = getattr(hub, 'longitude', hub.get('longitude') if isinstance(hub, dict) else None)

        if h_lat is not None and h_lng is not None:
            dist = haversine_distance(user_lat, user_lng, h_lat, h_lng)
            if dist < min_dist:
                min_dist = dist
                nearest = hub

    return (nearest, min_dist)
