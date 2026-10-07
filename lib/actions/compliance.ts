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
  getProject,
} from "@/lib/db";
import type { CertificationType, SiteLocation, GcNoticeStatus, GcNoticePriority, PermitType } from "@/lib/types";

const PERMIT_TYPES: PermitType[] = ["Hot Work", "Confined Space", "Excavation", "Energized Work"];

export async function createCertificationAction(formData: FormData) {
  const user = await getCurrentUser();
  if (user.role === "WORKER" || user.role === "CLIENT_VIEWER") {
    throw new Error("You do not have permission to add certifications.");
  }
  
  const userId = String(formData.get("userId") ?? "");
  const type = String(formData.get("type") ?? "") as CertificationType;
  const issuedOn = String(formData.get("issuedOn") ?? "");
  const expiresOn = String(formData.get("expiresOn") ?? "");

  if (!userId || !type || !issuedOn || !expiresOn) throw new Error("Missing required fields.");

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
  if (user.role === "WORKER" || user.role === "CLIENT_VIEWER") {
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

  const project = getProject(projectId);
  if (!project || project.companyId !== user.companyId) throw new Error("Project not found.");
  if (!type || !description || !startsAt || !expiresAt) throw new Error("Missing required fields.");
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
  if (!getCapabilities(user.role).canManageSettings) {
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
  if (!getCapabilities(user.role).canManageSettings) {
    throw new Error("Only an administrator can manage assets.");
  }

  const projectId = String(formData.get("projectId") ?? "");
  const tag = String(formData.get("tag") ?? "");
  const name = String(formData.get("name") ?? "");
  const category = String(formData.get("category") ?? "Lifting Equipment");

  const project = getProject(projectId);
  if (!project || project.companyId !== user.companyId) throw new Error("Project not found.");
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
  if (user.role === "WORKER" || user.role === "CLIENT_VIEWER") {
    throw new Error("You do not have permission to raise GC notices.");
  }

  const projectId = String(formData.get("projectId") ?? "");
  const trade = String(formData.get("trade") ?? "");
  const issue = String(formData.get("issue") ?? "");
  const impact = String(formData.get("impact") ?? "");
  const priority = String(formData.get("priority") ?? "medium") as GcNoticePriority;
  const status = String(formData.get("status") ?? "open") as GcNoticeStatus;

  const project = getProject(projectId);
  if (!project || project.companyId !== user.companyId) throw new Error("Project not found.");
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
