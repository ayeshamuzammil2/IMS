const EARTH_RADIUS_M = 6371000;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Mirrors the backend's GeoCalculator.DistanceInMeters exactly - used for a responsive live
 * readout only, the server always recomputes and is the sole source of truth. */
export function distanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

export type GeofenceState = 'Inside' | 'Uncertain' | 'Outside';

/** Mirrors the backend's GeoCalculator.Classify tri-state logic exactly. */
export function classifyGeofence(distanceM: number, accuracyM: number, radiusM: number, uncertainMaxAccuracyM = 100): GeofenceState {
  if (distanceM + accuracyM <= radiusM) return 'Inside';
  if (distanceM <= radiusM && accuracyM <= 50) return 'Inside';
  if (distanceM <= radiusM + accuracyM && accuracyM <= uncertainMaxAccuracyM) return 'Uncertain';
  return 'Outside';
}
