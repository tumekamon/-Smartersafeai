"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { createUser, findUserByEmail, getUser, updateUser } from "@/lib/db";
import type { UserRole } from "@/lib/types";

const ROLES: UserRole[] = ["ADMIN", "SAFETY_DIRECTOR", "SAFETY_MANAGER", "SUPERVISOR", "WORKER", "CLIENT_VIEWER"];

async function requireSettingsAccess() {
  const user = await getCurrentUser();
  if (!getCapabilities(user.role).canManageSettings) {
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

  if (!firstName || !lastName || !email) throw new Error("First name, last name, and email are required.");
  if (!ROLES.includes(role)) throw new Error("Not a valid role.");
  if (findUserByEmail(email)) throw new Error("Someone with that email already has an account.");

  createUser({ companyId: user.companyId, firstName, lastName, email, role, title: title || roleLabel(role) });
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

function roleLabel(role: UserRole) {
  return role.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
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
