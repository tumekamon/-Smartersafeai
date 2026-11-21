/**
 * Rules for the daily check-in, shared by the worker's phone (to give early feedback)
 * and the server (which has the final say). No server-only imports here.
 */

/** PPE every worker confirms before starting. A per-company list can replace this later. */
export const CHECK_IN_PPE = ["Hard hat", "Hi-vis vest", "Safety boots", "Safety glasses", "Gloves"];

/** A GPS fix worse than this can't tell inside from outside a site, so it's refused. */
export const MAX_GPS_ACCURACY_M = 100;

/** The photo must be sent within this long of being taken. */
export const MAX_CAPTURE_AGE_MS = 3 * 60_000;

/** Default boundary radius when an admin sets a site's centre. */
export const DEFAULT_SITE_RADIUS_M = 250;

/** Great-circle distance in metres (haversine). */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** The calendar day a check-in counts for (server local time). */
export function checkInDay(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}
