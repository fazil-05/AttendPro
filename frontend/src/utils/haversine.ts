// src/utils/haversine.ts
// Haversine distance calculation for geofencing

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isWithinGeofence(
  officeLat: number, officeLon: number,
  empLat: number, empLon: number,
  radiusMeters: number
): { inside: boolean; distance: number } {
  const distance = haversineDistance(officeLat, officeLon, empLat, empLon);
  return { inside: distance <= radiusMeters, distance: Math.round(distance) };
}
