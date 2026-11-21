import "server-only";
import { getCapabilities } from "@/lib/authz";
import { addFindingToInspection, createInspection, ensureHazardReportTemplate, getCompany } from "@/lib/db";
import { accessibleProject } from "@/lib/scope";
import { readEvidence } from "@/lib/evidence";
import { checkHazardPhoto } from "@/lib/mock-ai";
import type { RiskLevel, User } from "@/lib/types";

const RISKS: RiskLevel[] = ["low", "medium", "high", "critical"];

export type HazardReportResult = { error: string } | { inspectionId: string; findingId: string };

/**
 * Files a quick hazard report: one photo, a category, a severity and where. It becomes a
 * "Hazard report" inspection with one pending finding, so it lands in the same review
 * queue and fix flow as everything else. Used by the form's server action and by the
 * phone's offline outbox (app/api/outbox/hazard), so both apply exactly the same rules.
 */
export async function fileHazardReport(user: User, formData: FormData): Promise<HazardReportResult> {
  if (!getCapabilities(user).canSubmitInspections) return { error: "Your account can't report hazards." };

  // Only a site this person is on the crew of (L1/L2: any site of their company).
  const project = accessibleProject(user, String(formData.get("projectId") ?? ""));
  if (!project || project.status !== "active") return { error: "Pick one of your sites." };

  const level = String(formData.get("level") ?? "");
  const zone = String(formData.get("zone") ?? "");
  if (!project.levels.includes(level) || !project.zones.includes(zone)) return { error: "Pick the level and zone." };

  const category = String(formData.get("category") ?? "");
  const company = getCompany(user.companyId);
  if (!company?.hazardCategories.includes(category)) return { error: "Pick what kind of hazard it is." };

  const risk = String(formData.get("risk") ?? "") as RiskLevel;
  if (!RISKS.includes(risk)) return { error: "Pick how serious it is." };

  const note = String(formData.get("note") ?? "").trim().slice(0, 200);
  const { evidence, error } = await readEvidence(formData);
  if (error) return { error };
  if (evidence.length === 0 && !note) return { error: "Add a photo or say what you saw." };

  // When it was seen, if the phone held it back for lack of signal (never in the future).
  const seen = Date.parse(String(formData.get("seenAt") ?? ""));
  const createdAt = new Date(Number.isFinite(seen) && seen <= Date.now() && seen > Date.now() - 7 * 86_400_000 ? seen : Date.now()).toISOString();

  const photoCheck = checkHazardPhoto(category, evidence[0]);
  const template = ensureHazardReportTemplate(user.companyId);
  const inspection = createInspection({
    projectId: project.id,
    templateId: template.id,
    inspectorId: user.id,
    location: { level, zone },
    responses: [],
    evidence,
  });

  const findingId = `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  addFindingToInspection(inspection.id, {
    id: findingId,
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
    photoCheck,
    createdAt,
  });

  return { inspectionId: inspection.id, findingId };
}
