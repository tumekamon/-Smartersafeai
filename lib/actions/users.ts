"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { createUser, findUserByEmail, getUser, updateUser } from "@/lib/db";
import { EXTRA_PERMISSIONS, ROLES, ROLE_INFO } from "@/lib/roles";
import { checkPassword, setPassword } from "@/lib/password";
import type { UserRole } from "@/lib/types";

async function requireSettingsAccess() {
  const user = await getCurrentUser();
  if (!getCapabilities(user).canManageSettings) {
    throw new Error("Only an administrator can manage the team.");
  }
  return user;
}

export async function inviteUserAction(formData: FormData) {
  const user = await requireSettingsAccess();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "WORKER") as UserRole;
  const title = String(formData.get("title") ?? "").trim();
  const readOnly = formData.get("readOnly") === "on";

  if (!firstName || !lastName || !email) throw new Error("First name, last name, and email are required.");
  if (!ROLES.includes(role)) throw new Error("Not a valid role.");
  if (findUserByEmail(email)) throw new Error("Someone with that email already has an account.");

  createUser({ companyId: user.companyId, firstName, lastName, email, role, readOnly, title: title || ROLE_INFO[role].label });
  revalidatePath("/settings/team");
}

export async function updateUserRoleAction(formData: FormData) {
  const user = await requireSettingsAccess();
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "") as UserRole;
  if (!ROLES.includes(role)) throw new Error("Not a valid role.");
  if (userId === user.id) throw new Error("You can't change your own role.");
  const target = getUser(userId);
  if (!target || target.companyId !== user.companyId) throw new Error("Person not found.");

  updateUser(userId, { role });
  revalidatePath("/settings/team");
}

export async function setUserActiveAction(formData: FormData) {
  const user = await requireSettingsAccess();
  const userId = String(formData.get("userId") ?? "");
  const active = formData.get("active") === "true";
  if (userId === user.id) throw new Error("You can't deactivate your own account.");
  const target = getUser(userId);
  if (!target || target.companyId !== user.companyId) throw new Error("Person not found.");

  updateUser(userId, { active });
  revalidatePath("/settings/team");
}

export async function setUserReadOnlyAction(formData: FormData) {
  const user = await requireSettingsAccess();
  const userId = String(formData.get("userId") ?? "");
  const readOnly = formData.get("readOnly") === "true";
  if (userId === user.id) throw new Error("You can't change your own access.");
  const target = getUser(userId);
  if (!target || target.companyId !== user.companyId) throw new Error("Person not found.");

  updateUser(userId, { readOnly });
  revalidatePath("/settings/team");
}

export async function updateProfileAction(formData: FormData) {
  const user = await getCurrentUser();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();

  if (!firstName || !lastName) throw new Error("First and last name are required.");

  updateUser(user.id, { firstName, lastName, title });
  revalidatePath("/settings/profile");
  revalidatePath("/dashboard");
}

export async function toggleExtraPermissionAction(formData: FormData) {
  const user = await requireSettingsAccess();
  const userId = String(formData.get("userId") ?? "");
  const permission = String(formData.get("permission") ?? "");
  const perm = EXTRA_PERMISSIONS.find((p) => p.id === permission)?.id;
  if (!perm) throw new Error("Not a valid permission.");
  const target = getUser(userId);
  if (!target || target.companyId !== user.companyId) throw new Error("Person not found.");

  const current = new Set(target.extraPermissions ?? []);
  if (current.has(perm)) current.delete(perm);
  else current.add(perm);
  updateUser(userId, { extraPermissions: [...current] });
  revalidatePath("/settings/team");
}

export type ChangePasswordState = { error?: string; ok?: boolean } | undefined;

export async function changePasswordAction(_state: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  const user = await getCurrentUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (!checkPassword(user.id, current)) return { error: "Your current password is not right." };
  if (next.length < 10) return { error: "Use at least 10 characters." };
  if (next === current) return { error: "Pick a password you haven't used here." };
  setPassword(user.id, next);
  return { ok: true };
}
