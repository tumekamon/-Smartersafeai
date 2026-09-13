import "server-only";
import { cookies } from "next/headers";
import type { SessionPayload } from "@/lib/types";

/**
 * Prototype session handling: an unsigned cookie carrying just a user id.
 * No passwords or secrets are stored, so this deliberately skips JWT/encryption.
 * Sprint 1 (per roadmap) replaces this with real auth (hashed passwords, signed
 * sessions) once the Postgres backend exists — see resources/chatgpt_transcript.md.
 */

const COOKIE_NAME = "smartsafe_session";

export async function createSession(userId: string) {
  const payload: SessionPayload = { userId };
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, JSON.stringify(payload), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionPayload;
  } catch {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
