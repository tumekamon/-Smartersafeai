"use server";

import { redirect } from "next/navigation";
import { findUserByEmail } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";

export type LoginState = { error?: string } | undefined;

// Prototype-only: every seeded user shares this password. Real credential
// checking lands with the Sprint 1 backend/auth work.
const DEMO_PASSWORD = "demo1234";

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const user = findUserByEmail(email);
  if (!user || !user.active) {
    return { error: "No matching account found." };
  }
  if (password !== DEMO_PASSWORD) {
    return { error: "Incorrect password." };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
