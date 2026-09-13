"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import {
  addFindingToInspection,
  createInspection as dbCreateInspection,
  getTemplate,
} from "@/lib/db";
import { analyzeInspection } from "@/lib/mock-ai";
import type { ChecklistResponse, ChecklistResponseValue, Evidence } from "@/lib/types";

export type SubmitInspectionState = { error?: string } | undefined;

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
  const template = getTemplate(templateId);

  if (!projectId || !template) {
    return { error: "Missing project or inspection template." };
  }

  const responses: ChecklistResponse[] = template.checklist.map((item) => {
    const value = String(formData.get(`response_${item.id}`) ?? "na") as ChecklistResponseValue;
    const note = String(formData.get(`note_${item.id}`) ?? "").trim();
    return { itemId: item.id, value, note: note || undefined };
  });

  const evidence: Evidence[] = formData
    .getAll("evidence")
    .filter((file): file is File => file instanceof File && file.size > 0)
    .map((file, index) => ({
      id: `ev_${Date.now()}_${index}`,
      fileName: file.name,
      dataUrl: "",
    }));

  const inspection = dbCreateInspection({
    projectId,
    templateId,
    inspectorId: user.id,
    responses,
    evidence,
  });

  const findings = analyzeInspection(template, responses, inspection.id);
  findings.forEach((finding, index) => {
    addFindingToInspection(inspection.id, { ...finding, id: `f_${Date.now()}_${index}` });
  });

  redirect(`/inspections/${inspection.id}`);
}
