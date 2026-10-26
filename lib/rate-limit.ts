import "server-only";

/**
 * Slows down password guessing: after 5 failed sign-ins for one email, or 30 from one
 * network address (a whole crew can share a site's connection), further tries are refused
 * until the 15-minute window passes.
 */

const WINDOW_MS = 15 * 60 * 1000;
const maxFailures = (key: string) => (key.startsWith("ip:") ? 30 : 5);

const globalForLimits = globalThis as unknown as { __smartsafeLoginFailures?: Map<string, number[]> };
const failures = globalForLimits.__smartsafeLoginFailures ?? new Map<string, number[]>();
globalForLimits.__smartsafeLoginFailures = failures;

function recent(key: string, now: number) {
  const list = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  failures.set(key, list);
  return list;
}

export function isLockedOut(keys: string[], now = Date.now()) {
  return keys.some((k) => recent(k, now).length >= maxFailures(k));
}

export function recordFailure(keys: string[], now = Date.now()) {
  for (const k of keys) failures.set(k, [...recent(k, now), now]);
}

export function clearFailures(keys: string[]) {
  for (const k of keys) failures.delete(k);
}
