import "server-only";
import type { Finding, Inspection, InspectionTemplate } from "@/lib/types";

/**
 * Stand-in for the vision/risk pipeline (image quality -> detection -> hazard ->
 * risk engine). It turns failed checklist items into findings using each item's
 * hazard profile, so the human review workflow runs end to end before the real
 * computer-vision model exists.
 */
export function analyzeInspection(
  template: InspectionTemplate,
  inspection: Inspection
): Array<Omit<Finding, "id">> {
  if (!template.aiAnalysisEnabled) return [];

  const evidence = inspection.evidence[0];

  return inspection.responses
    .filter((r) => r.value === "fail")
    .map((response) => {
      const item = template.checklist.find((c) => c.id === response.itemId);
      const hazard = item?.hazard;
      const confidence = 0.7 + ((item?.label.length ?? 0) % 5) * 0.05;

      return {
        inspectionId: inspection.id,
        projectId: inspection.projectId,
        location: inspection.location,
        hazardCategory: hazard?.category ?? "Housekeeping",
        title: hazard?.title ?? item?.label ?? "Unspecified hazard",
        aiConfidence: Math.min(confidence, 0.97),
        riskLevel: hazard?.risk ?? "medium",
        aiExplanation: `${hazard?.narrative ?? "Failed checklist item flagged for review."}${
          response.note ? ` Inspector note: ${response.note}.` : ""
        }`,
        regulatoryReference: hazard?.regulatoryReference ?? "OSHA 1926 Subpart C",
        evidenceId: evidence?.id,
        reviewerDecision: "pending" as const,
        createdAt: new Date().toISOString(),
      };
    });
}
