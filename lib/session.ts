import "server-only";
import { cookies } from "next/headers";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { SessionPayload } from "@/lib/types";

/**
 * The session cookie is encrypted and authenticated with AES-256-GCM, so it can be
 * neither read nor forged in the browser, and it carries its own expiry.
 * The key comes from SESSION_SECRET; without it, a random key is made at start-up
 * (fine for the prototype, whose data also resets on restart).
 */

const COOKIE_NAME = "smartsafe_session";
const MAX_AGE_S = 60 * 60 * 24 * 7;

const globalForKey = globalThis as unknown as { __smartsafeSessionKey?: Buffer };
function key(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return createHash("sha256").update(secret).digest();
  globalForKey.__smartsafeSessionKey ??= randomBytes(32);
  return globalForKey.__smartsafeSessionKey;
}

function seal(payload: SessionPayload): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map((b) => b.toString("base64url")).join(".");
}

function unseal(token: string): SessionPayload | null {
  try {
    const [iv, tag, body] = token.split(".").map((p) => Buffer.from(p, "base64url"));
    if (!iv || !tag || !body) return null;
    const decipher = createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    const payload = JSON.parse(Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8")) as SessionPayload;
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

export async function createSession(userId: string) {
  const now = Date.now();
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, seal({ userId, iat: now, exp: now + MAX_AGE_S * 1000 }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  return raw ? unseal(raw) : null;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
