"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import {
  addFindingToInspection,
  createInspection,
  ensureHazardReportTemplate,
  getCompany,
  getProject,
} from "@/lib/db";
import { readEvidence } from "@/lib/evidence";
import type { RiskLevel } from "@/lib/types";

export type HazardReportState = { error?: string } | undefined;

const RISKS: RiskLevel[] = ["low", "medium", "high", "critical"];

/**
 * Quick hazard report from site: one photo, a category tap, a severity tap. It is filed as a
 * "Hazard report" inspection with one pending finding, so it lands in the same review queue
 * and corrective-action flow as everything else.
 */
export async function submitHazardReport(_state: HazardReportState, formData: FormData): Promise<HazardReportState> {
  const user = await getCurrentUser();
  if (!getCapabilities(user).canSubmitInspections) {
    return { error: "Your account can't report hazards." };
  }

  const project = getProject(String(formData.get("projectId") ?? ""));
  if (!project || project.companyId !== user.companyId) return { error: "Pick the site." };

  const level = String(formData.get("level") ?? "");
  const zone = String(formData.get("zone") ?? "");
  if (!project.levels.includes(level) || !project.zones.includes(zone)) return { error: "Pick the level and zone." };

  const category = String(formData.get("category") ?? "");
  const company = getCompany(user.companyId);
  if (!company?.hazardCategories.includes(category)) return { error: "Pick what kind of hazard it is." };

  const risk = String(formData.get("risk") ?? "") as RiskLevel;
  if (!RISKS.includes(risk)) return { error: "Pick how serious it is." };

  const note = String(formData.get("note") ?? "").trim();
  const { evidence, error } = await readEvidence(formData);
  if (error) return { error };
  if (evidence.length === 0 && !note) return { error: "Add a photo or say what you saw." };

  const template = ensureHazardReportTemplate(user.companyId);
  const inspection = createInspection({
    projectId: project.id,
    templateId: template.id,
    inspectorId: user.id,
    location: { level, zone },
    responses: [],
    evidence,
  });

  addFindingToInspection(inspection.id, {
    id: `f_${Date.now()}`,
    inspectionId: inspection.id,
    projectId: project.id,
    location: { level, zone },
    hazardCategory: category,
    title: note ? note.slice(0, 80) : `${category} hazard`,
    aiConfidence: 1,
    riskLevel: risk,
    aiExplanation: note || `Reported from site by ${user.firstName} ${user.lastName}.`,
    regulatoryReference: "To be classified on review",
    evidenceId: evidence[0]?.id,
    reviewerDecision: "pending",
    source: "field",
    createdAt: new Date().toISOString(),
  });

  redirect(`/inspections/${inspection.id}?reported=1`);
}
