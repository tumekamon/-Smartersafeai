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
import type { ChecklistResponse, ChecklistResponseValue, Evidence } from "@/lib/types";

export type SubmitInspectionState = { error?: string } | undefined;

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export async function submitInspection(
  _state: SubmitInspectionState,
  formData: FormData
): Promise<SubmitInspectionState> {
  const user = await getCurrentUser();
  if (!getCapabilities(user.role).canSubmitInspections) {
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
  if (!project.levels.includes(level) || !project.zones.includes(zone)) {
    return { error: "Choose the level and zone that was inspected." };
  }

  const responses: ChecklistResponse[] = template.checklist.map((item) => {
    const value = String(formData.get(`response_${item.id}`) ?? "na") as ChecklistResponseValue;
    const note = String(formData.get(`note_${item.id}`) ?? "").trim();
    return { itemId: item.id, value, note: note || undefined };
  });

  const files = formData
    .getAll("evidence")
    .filter((file): file is File => file instanceof File && file.size > 0);

  const evidence: Evidence[] = [];
  for (const [index, file] of files.entries()) {
    if (file.size > MAX_IMAGE_BYTES) {
      return { error: `${file.name} is larger than 4 MB.` };
    }
    const bytes = Buffer.from(await file.arrayBuffer()).toString("base64");
    evidence.push({
      id: `ev_${Date.now()}_${index}`,
      fileName: file.name,
      dataUrl: `data:${file.type || "image/jpeg"};base64,${bytes}`,
      capturedAt: new Date().toISOString(),
    });
  }

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

  redirect(`/inspections/${inspection.id}`);
}
