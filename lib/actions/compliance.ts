"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import {
  createCertification,
  createPermit,
  createPpeItem,
  createAsset,
  createGcNotice,
  getUser,
} from "@/lib/db";
import { isCertificationType } from "@/lib/certifications";
import { accessibleProject, sitesFor, worksOnSite } from "@/lib/scope";
import type { CertificationType, SiteLocation, GcNoticeStatus, GcNoticePriority, PermitType } from "@/lib/types";

const PERMIT_TYPES: PermitType[] = ["Hot Work", "Confined Space", "Excavation", "Energized Work"];

export async function createCertificationAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!getCapabilities(user).canManageCompliance) {
    throw new Error("You do not have permission to add certifications.");
  }
  
  const userId = String(formData.get("userId") ?? "");
  const type = String(formData.get("type") ?? "") as CertificationType;
  const issuedOn = String(formData.get("issuedOn") ?? "");
  const expiresOn = String(formData.get("expiresOn") ?? "");

  if (!userId || !type || !issuedOn || !expiresOn) throw new Error("Missing required fields.");
  if (!isCertificationType(type)) throw new Error("Unknown certification type.");
  // The person must be in this company and, for a supervisor, on one of their sites.
  const person = getUser(userId);
  if (!person || !sitesFor(user).some((p) => worksOnSite(person, p))) throw new Error("Person not found.");

  createCertification({
    userId,
    type,
    issuedOn,
    expiresOn,
  });

  revalidatePath("/compliance");
  redirect("/compliance?tab=training");
}

export async function createPermitAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!getCapabilities(user).canManageCompliance) {
    throw new Error("You do not have permission to issue permits.");
  }

  const projectId = String(formData.get("projectId") ?? "");
  const type = String(formData.get("type") ?? "") as PermitType;
  const description = String(formData.get("description") ?? "");
  const level = String(formData.get("level") ?? "");
  const zone = String(formData.get("zone") ?? "");
  const startsAt = String(formData.get("startsAt") ?? "");
  const expiresAt = String(formData.get("expiresAt") ?? "");
  const attendantId = String(formData.get("attendantId") ?? "") || undefined;

  // Only a site this person works on; anything else reads as "not found".
  const project = accessibleProject(user, projectId);
  if (!project) throw new Error("Project not found.");
  if (!type || !description || !startsAt || !expiresAt) throw new Error("Missing required fields.");
  if (attendantId) {
    const attendant = getUser(attendantId);
    if (!attendant || !worksOnSite(attendant, project)) throw new Error("The fire/safety watch must be on this site's crew.");
  }
  if (!PERMIT_TYPES.includes(type)) throw new Error("Unknown permit type.");

  createPermit({
    projectId,
    type,
    description,
    location: { level, zone },
    startsAt: new Date(startsAt).toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
    issuedById: user.id,
    attendantId,
  });

  revalidatePath("/compliance");
  redirect("/compliance?tab=permits");
}

export async function createPpeItemAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!getCapabilities(user).canManageSettings) {
    throw new Error("Only an administrator can manage PPE.");
  }

  const name = String(formData.get("name") ?? "");
  const received = Number(formData.get("received") ?? 0);
  const issued = Number(formData.get("issued") ?? 0);
  const reorderPoint = Number(formData.get("reorderPoint") ?? 0);
  const unitCost = Number(formData.get("unitCost") ?? 0);

  if (!name) throw new Error("Name is required.");

  createPpeItem({
    companyId: user.companyId,
    name,
    received,
    issued,
    reorderPoint,
    unitCost,
  });

  revalidatePath("/compliance");
  redirect("/compliance?tab=ppe");
}

export async function createAssetAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!getCapabilities(user).canManageSettings) {
    throw new Error("Only an administrator can manage assets.");
  }

  const projectId = String(formData.get("projectId") ?? "");
  const tag = String(formData.get("tag") ?? "");
  const name = String(formData.get("name") ?? "");
  const category = String(formData.get("category") ?? "Lifting Equipment");

  // Only a site this person works on; anything else reads as "not found".
  const project = accessibleProject(user, projectId);
  if (!project) throw new Error("Project not found.");
  if (!tag || !name) throw new Error("Tag and name are required.");

  createAsset({
    projectId,
    tag,
    name,
    category,
  });

  revalidatePath("/compliance");
  redirect("/compliance?tab=equipment");
}

export async function createGcNoticeAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!getCapabilities(user).canManageCompliance) {
    throw new Error("You do not have permission to raise GC notices.");
  }

  const projectId = String(formData.get("projectId") ?? "");
  const trade = String(formData.get("trade") ?? "");
  const issue = String(formData.get("issue") ?? "");
  const impact = String(formData.get("impact") ?? "");
  const priority = String(formData.get("priority") ?? "medium") as GcNoticePriority;
  const status = String(formData.get("status") ?? "open") as GcNoticeStatus;

  // Only a site this person works on; anything else reads as "not found".
  const project = accessibleProject(user, projectId);
  if (!project) throw new Error("Project not found.");
  if (!trade || !issue) throw new Error("Trade and issue description are required.");

  createGcNotice({
    projectId,
    trade,
    issue,
    impact,
    priority,
    status,
    raisedById: user.id,
  });

  revalidatePath("/compliance");
  redirect("/compliance?tab=notices");
}
