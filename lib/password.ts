import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Passwords are stored only as salted scrypt hashes, never in plain text, and kept
 * in their own map (not on User) so a hash can never ride along to the browser
 * with a user object.
 */

const KEY_LEN = 32;
const COST = 16384;

// Prototype: every seeded account starts on this password until its owner changes it.
export const DEMO_PASSWORD = "demo1234";

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LEN, { N: COST });
  return `scrypt$${COST}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, cost, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = scryptSync(password, Buffer.from(saltB64, "base64"), expected.length, { N: Number(cost) });
  return timingSafeEqual(actual, expected);
}

const globalForCreds = globalThis as unknown as { __smartsafeCredentials?: Map<string, string> };
const credentials = globalForCreds.__smartsafeCredentials ?? new Map<string, string>();
globalForCreds.__smartsafeCredentials = credentials;

/** The stored hash for a user, creating the demo one on first use. */
function credentialFor(userId: string): string {
  let hash = credentials.get(userId);
  if (!hash) {
    hash = hashPassword(DEMO_PASSWORD);
    credentials.set(userId, hash);
  }
  return hash;
}

export function checkPassword(userId: string, password: string): boolean {
  return verifyPassword(password, credentialFor(userId));
}

export function setPassword(userId: string, password: string) {
  credentials.set(userId, hashPassword(password));
}

// A dummy hash so unknown emails take as long as real ones and can't be told apart by timing.
let dummyHash: string | undefined;
export function burnPasswordCheck(password: string) {
  dummyHash ??= hashPassword(randomBytes(12).toString("hex"));
  verifyPassword(password, dummyHash);
}
