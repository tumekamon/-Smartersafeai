"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import {
  addFindingToInspection,
  createInspection as dbCreateInspection,
  getInspection,
  getProject,
  getTemplate,
} from "@/lib/db";
import { analyzeInspection } from "@/lib/mock-ai";
import { readEvidence } from "@/lib/evidence";
import type { ChecklistResponse, ChecklistResponseValue } from "@/lib/types";

export type SubmitInspectionState = { error?: string } | undefined;

export async function submitInspection(
  _state: SubmitInspectionState,
  formData: FormData
): Promise<SubmitInspectionState> {
  const user = await getCurrentUser();
  if (!getCapabilities(user).canSubmitInspections) {
    return { error: "Your role does not have permission to submit inspections." };
  }

  const projectId = String(formData.get("projectId") ?? "");
  const templateId = String(formData.get("templateId") ?? "");
  const level = String(formData.get("level") ?? "");
  const zone = String(formData.get("zone") ?? "");
  const project = getProject(projectId);
  const template = getTemplate(templateId);

  if (!project || !template) {
    return { error: "Missing project or inspection template." };
  }
  if (project.companyId !== user.companyId || template.companyId !== user.companyId) {
    return { error: "Missing project or inspection template." };
  }
  if (!project.levels.includes(level) || !project.zones.includes(zone)) {
    return { error: "Choose the level and zone that was inspected." };
  }

  const responses: ChecklistResponse[] = template.checklist.map((item) => {
    const value = String(formData.get(`response_${item.id}`) ?? "na") as ChecklistResponseValue;
    const note = String(formData.get(`note_${item.id}`) ?? "").trim();
    return { itemId: item.id, value, note: note || undefined };
  });

  const { evidence, error } = await readEvidence(formData);
  if (error) return { error };

  const inspection = dbCreateInspection({
    projectId,
    templateId,
    inspectorId: user.id,
    location: { level, zone },
    responses,
    evidence,
  });

  const created = getInspection(inspection.id);
  if (created) {
    const findings = analyzeInspection(template, created);
    findings.forEach((finding, index) => {
      addFindingToInspection(inspection.id, { ...finding, id: `f_${Date.now()}_${index}` });
    });
    if (findings.length === 0) created.status = "reviewed";
  }

  redirect(`/inspections/${inspection.id}?submitted=1`);
}
