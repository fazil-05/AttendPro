// src/utils/haversine.ts
// Haversine formula — migrated from backend, safe to run in browser

/**
 * Calculate the distance in meters between two geographic coordinates.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Check if a point is within a geofenced radius.
 */
export function isWithinGeofence(
  officeLat: number,
  officeLon: number,
  employeeLat: number,
  employeeLon: number,
  radiusMeters: number
): { inside: boolean; distance: number } {
  const distance = haversineDistance(officeLat, officeLon, employeeLat, employeeLon);
  return {
    inside: distance <= radiusMeters,
    distance: Math.round(distance),
  };
}
