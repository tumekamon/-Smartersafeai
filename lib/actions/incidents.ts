"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { addIncidentField, createIncident, getCompany, getIncident, getProject, moveIncidentField, removeIncidentField, updateIncidentStatus } from "@/lib/db";
import type { IncidentStatus, IncidentType } from "@/lib/types";

const TYPES: IncidentType[] = ["near_miss", "first_aid", "recordable", "property_damage", "illness"];

export async function reportIncidentAction(formData: FormData) {
  const user = await getCurrentUser();
  if (getCapabilities(user).isReadOnly) {
    throw new Error("Your role cannot report incidents.");
  }

  const projectId = String(formData.get("projectId") ?? "");
  const project = getProject(projectId);
  if (!project || project.companyId !== user.companyId) throw new Error("Project not found.");

  const type = String(formData.get("type") ?? "") as IncidentType;
  if (!TYPES.includes(type)) throw new Error("Not a valid incident type.");

  const description = String(formData.get("description") ?? "").trim();
  const immediateAction = String(formData.get("immediateAction") ?? "").trim();
  const level = String(formData.get("level") ?? "").trim();
  const zone = String(formData.get("zone") ?? "").trim();
  const oshaRecordable = formData.get("oshaRecordable") === "on";
  const lostTimeDays = Math.max(0, Number(formData.get("lostTimeDays") ?? 0) || 0);
  const involvedUserIds = formData.getAll("involvedUserIds").map(String).filter(Boolean);

  if (!description) throw new Error("Describe what happened.");

  const customAnswers: Record<string, string> = {};
  for (const field of getCompany(user.companyId)?.incidentFields ?? []) {
    const value = String(formData.get(`field_${field.id}`) ?? "").trim();
    if (field.required && !value) throw new Error(`Answer: ${field.label}`);
    if (value && field.kind === "choice" && !field.options?.includes(value)) throw new Error(`Pick an option for: ${field.label}`);
    if (value && field.kind === "yesno" && value !== "Yes" && value !== "No") throw new Error(`Answer yes or no: ${field.label}`);
    if (value) customAnswers[field.id] = value.slice(0, 300);
  }

  createIncident({
    projectId,
    type,
    description,
    location: { level: level || "Site", zone: zone || "General" },
    involvedUserIds,
    immediateAction,
    oshaRecordable,
    lostTimeDays,
    reportedById: user.id,
    customAnswers,
  });

  revalidatePath("/incidents");
  redirect("/incidents");
}

export async function updateIncidentStatusAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!getCapabilities(user).canReviewFindings) {
    throw new Error("Only a safety professional can change an incident's status.");
  }

  const incidentId = String(formData.get("incidentId") ?? "");
  const incident = getIncident(incidentId);
  if (!incident) throw new Error("Incident not found.");
  const project = getProject(incident.projectId);
  if (!project || project.companyId !== user.companyId) throw new Error("Incident not found.");

  const status = String(formData.get("status") ?? "") as IncidentStatus;
  updateIncidentStatus(incidentId, status);
  revalidatePath("/incidents");
}

async function requireIncidentFormAccess() {
  const user = await getCurrentUser();
  if (!getCapabilities(user).canManageSettings) throw new Error("Only an administrator can change the incident form.");
  return user;
}

export async function addIncidentFieldAction(formData: FormData) {
  const user = await requireIncidentFormAccess();
  const label = String(formData.get("label") ?? "").trim().slice(0, 120);
  const kind = String(formData.get("kind") ?? "");
  if (!label) throw new Error("Give the question a name.");
  if (kind !== "text" && kind !== "choice" && kind !== "yesno") throw new Error("Not a valid answer type.");
  const options = String(formData.get("options") ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)
    .slice(0, 12);
  if (kind === "choice" && options.length < 2) throw new Error("A pick-one question needs at least two options, separated by commas.");

  addIncidentField(user.companyId, { label, kind, options: kind === "choice" ? options : undefined, required: formData.get("required") === "on" });
  revalidatePath("/settings/incident-form");
}

export async function removeIncidentFieldAction(formData: FormData) {
  const user = await requireIncidentFormAccess();
  removeIncidentField(user.companyId, String(formData.get("fieldId") ?? ""));
  revalidatePath("/settings/incident-form");
}

export async function moveIncidentFieldAction(formData: FormData) {
  const user = await requireIncidentFormAccess();
  moveIncidentField(user.companyId, String(formData.get("fieldId") ?? ""), formData.get("dir") === "up" ? -1 : 1);
  revalidatePath("/settings/incident-form");
}
