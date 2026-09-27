"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { addCrewMember, createProject, getProject, removeCrewMember, updateProject } from "@/lib/db";
import type { ProjectStatus } from "@/lib/types";

async function requireSettingsAccess() {
  const user = await getCurrentUser();
  if (!getCapabilities(user.role).canManageSettings) {
    throw new Error("Only an administrator can manage projects.");
  }
  return user;
}

function splitList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function createProjectAction(formData: FormData) {
  const user = await requireSettingsAccess();
  const name = String(formData.get("name") ?? "").trim();
  const shortName = String(formData.get("shortName") ?? "").trim();
  const projectNumber = String(formData.get("projectNumber") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const client = String(formData.get("client") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const headcount = Number(formData.get("headcount") ?? 0) || 0;
  const levels = splitList(String(formData.get("levels") ?? ""));
  const zones = splitList(String(formData.get("zones") ?? ""));
  if (!name || !shortName) throw new Error("Project name and short name are required.");

  const project = createProject({
    companyId: user.companyId,
    name,
    shortName,
    projectNumber,
    location,
    client,
    startDate: startDate || new Date().toISOString().slice(0, 10),
    levels: levels.length ? levels : ["L1"],
    zones: zones.length ? zones : ["Zone A"],
    headcount,
  });

  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function updateProjectAction(formData: FormData) {
  const user = await requireSettingsAccess();
  const projectId = String(formData.get("projectId") ?? "");
  const project = getProject(projectId);
  if (!project || project.companyId !== user.companyId) throw new Error("Project not found.");

  const updates: Parameters<typeof updateProject>[1] = {};
  if (formData.has("status")) updates.status = String(formData.get("status")) as ProjectStatus;
  if (formData.has("name")) updates.name = String(formData.get("name")).trim();
  if (formData.has("shortName")) updates.shortName = String(formData.get("shortName")).trim();
  if (formData.has("location")) updates.location = String(formData.get("location")).trim();
  if (formData.has("client")) updates.client = String(formData.get("client")).trim();
  if (formData.has("headcount")) updates.headcount = Number(formData.get("headcount")) || 0;
  if (formData.has("percentComplete")) updates.percentComplete = Number(formData.get("percentComplete")) || 0;

  updateProject(projectId, updates);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  redirect(`/projects/${projectId}`);
}

export async function addCrewMemberAction(formData: FormData) {
  const user = await requireSettingsAccess();
  const projectId = String(formData.get("projectId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const project = getProject(projectId);
  if (!project || project.companyId !== user.companyId) throw new Error("Project not found.");
  if (!userId) return;

  addCrewMember(projectId, userId);
  revalidatePath(`/projects/${projectId}`);
}

export async function removeCrewMemberAction(formData: FormData) {
  const user = await requireSettingsAccess();
  const projectId = String(formData.get("projectId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const project = getProject(projectId);
  if (!project || project.companyId !== user.companyId) throw new Error("Project not found.");

  removeCrewMember(projectId, userId);
  revalidatePath(`/projects/${projectId}`);
}
