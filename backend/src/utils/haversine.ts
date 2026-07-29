// src/utils/haversine.ts
// Haversine formula to calculate distance between two GPS coordinates

/**
 * Calculate the distance in meters between two geographic coordinates
 * using the Haversine formula.
 *
 * @param lat1 - Latitude of point 1 (degrees)
 * @param lon1 - Longitude of point 1 (degrees)
 * @param lat2 - Latitude of point 2 (degrees)
 * @param lon2 - Longitude of point 2 (degrees)
 * @returns Distance in meters
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
  return R * c; // Distance in meters
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Check if a point is within a geofenced radius.
 * @param officeLat - Office latitude
 * @param officeLon - Office longitude
 * @param employeeLat - Employee latitude
 * @param employeeLon - Employee longitude
 * @param radiusMeters - Allowed radius in meters
 * @returns { inside: boolean, distance: number }
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
