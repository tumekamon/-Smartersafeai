"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { findUserByEmail } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";
import { burnPasswordCheck, checkPassword } from "@/lib/password";
import { clearFailures, isLockedOut, recordFailure } from "@/lib/rate-limit";

export type LoginState = { error?: string } | undefined;

// One message for every failure, so the form never reveals which emails have accounts.
const BAD_LOGIN = "Email or password is incorrect.";

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const keys = [`email:${email}`, `ip:${ip}`];

  if (isLockedOut(keys)) {
    return { error: "Too many failed attempts. Wait 15 minutes and try again." };
  }

  const user = findUserByEmail(email);
  let ok = false;
  if (user?.active) ok = checkPassword(user.id, password);
  else burnPasswordCheck(password);
  if (!user || !ok) {
    recordFailure(keys);
    return { error: BAD_LOGIN };
  }

  // Only the account's own count resets; the address count must not be wiped by one good login.
  clearFailures([`email:${email}`]);
  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
