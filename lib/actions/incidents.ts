"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { createIncident, getIncident, getProject, updateIncidentStatus } from "@/lib/db";
import type { IncidentStatus, IncidentType } from "@/lib/types";

const TYPES: IncidentType[] = ["near_miss", "first_aid", "recordable", "property_damage", "illness"];

export async function reportIncidentAction(formData: FormData) {
  const user = await getCurrentUser();
  if (getCapabilities(user.role).isReadOnly) {
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
  });

  revalidatePath("/incidents");
  redirect("/incidents");
}

export async function updateIncidentStatusAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!getCapabilities(user.role).canReviewFindings) {
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
