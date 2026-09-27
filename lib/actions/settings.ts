"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import {
  addChecklistItem,
  addHazardCategory,
  createTemplate,
  deleteTemplate,
  removeChecklistItem,
  removeHazardCategory,
  updateChecklistItem,
  updateCompanyBranding,
  updateTemplate,
} from "@/lib/db";
import type { EvidenceRequirement, HazardProfile, RiskLevel, SceneKind } from "@/lib/types";

async function requireSettingsAccess() {
  const user = await getCurrentUser();
  if (!getCapabilities(user.role).canManageSettings) {
    throw new Error("Only an administrator can change workspace settings.");
  }
  return user;
}

export async function updateBrandingAction(formData: FormData) {
  const user = await requireSettingsAccess();
  const name = String(formData.get("name") ?? "");
  const primaryColor = String(formData.get("primaryColor") ?? "");

  updateCompanyBranding(user.companyId, { name, primaryColor });

  revalidatePath("/", "layout");
}

export async function addCategoryAction(formData: FormData) {
  const user = await requireSettingsAccess();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  addHazardCategory(user.companyId, name);
  revalidatePath("/settings");
}

export async function removeCategoryAction(formData: FormData) {
  const user = await requireSettingsAccess();
  const name = String(formData.get("name") ?? "");

  const ok = removeHazardCategory(user.companyId, name);
  if (!ok) throw new Error(`"${name}" is used by a checklist item and can't be removed.`);
  revalidatePath("/settings");
}

export async function createTemplateAction(formData: FormData) {
  const user = await requireSettingsAccess();
  const name = String(formData.get("name") ?? "").trim();
  const evidenceRequirement = String(formData.get("evidenceRequirement") ?? "optional") as EvidenceRequirement;
  const aiAnalysisEnabled = formData.get("aiAnalysisEnabled") === "on";
  if (!name) throw new Error("Template name is required.");

  const template = createTemplate({ companyId: user.companyId, name, evidenceRequirement, aiAnalysisEnabled });
  revalidatePath("/settings");
  redirect(`/settings/templates/${template.id}`);
}

export async function updateTemplateAction(formData: FormData) {
  await requireSettingsAccess();
  const id = String(formData.get("templateId") ?? "");
  const name = String(formData.get("name") ?? "");
  const evidenceRequirement = String(formData.get("evidenceRequirement") ?? "optional") as EvidenceRequirement;
  const aiAnalysisEnabled = formData.get("aiAnalysisEnabled") === "on";

  updateTemplate(id, { name, evidenceRequirement, aiAnalysisEnabled });
  revalidatePath(`/settings/templates/${id}`);
  revalidatePath("/settings");
}

export async function deleteTemplateAction(formData: FormData) {
  await requireSettingsAccess();
  const id = String(formData.get("templateId") ?? "");
  const ok = deleteTemplate(id);
  if (!ok) throw new Error("This template already has inspections logged against it and can't be deleted.");
  revalidatePath("/settings");
}

function readHazardProfile(formData: FormData): HazardProfile {
  return {
    category: String(formData.get("category") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    regulatoryReference: String(formData.get("regulatoryReference") ?? "").trim(),
    risk: String(formData.get("risk") ?? "medium") as RiskLevel,
    scene: String(formData.get("scene") ?? "generic") as SceneKind,
    narrative: String(formData.get("narrative") ?? "").trim(),
    remedy: String(formData.get("remedy") ?? "").trim(),
  };
}

export async function addChecklistItemAction(formData: FormData) {
  await requireSettingsAccess();
  const templateId = String(formData.get("templateId") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  if (!label) throw new Error("Checklist item label is required.");

  addChecklistItem(templateId, { label, hazard: readHazardProfile(formData) });
  revalidatePath(`/settings/templates/${templateId}`);
}

export async function updateChecklistItemAction(formData: FormData) {
  await requireSettingsAccess();
  const templateId = String(formData.get("templateId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");
  const label = String(formData.get("label") ?? "").trim();

  updateChecklistItem(templateId, itemId, { label, hazard: readHazardProfile(formData) });
  revalidatePath(`/settings/templates/${templateId}`);
}

export async function removeChecklistItemAction(formData: FormData) {
  await requireSettingsAccess();
  const templateId = String(formData.get("templateId") ?? "");
  const itemId = String(formData.get("itemId") ?? "");

  const ok = removeChecklistItem(templateId, itemId);
  if (!ok) throw new Error("This item already has inspection responses recorded and can't be removed.");
  revalidatePath(`/settings/templates/${templateId}`);
}
