import "server-only";
import type { ChecklistResponse, Finding, InspectionTemplate, RiskLevel } from "@/lib/types";

/**
 * Stand-in for the vision/risk pipeline described in resources/chatgpt_transcript.md
 * (image quality -> object detection -> hazard detection -> risk engine). Real
 * computer vision is deferred past the MVP per the kickoff meeting; this produces
 * plausible findings from failed checklist items so the human-in-the-loop review
 * workflow can be built and demoed now.
 */

const REGULATORY_REFERENCES: Record<string, string> = {
  electrical: "OSHA 1926.404(b)(1)(i)",
  ppe: "OSHA 1926.95(a)",
  housekeeping: "OSHA 1926.25(a)",
  egress: "OSHA 1926.34(a)",
  fall: "OSHA 1926.501(b)(1)",
  default: "OSHA 1926 Subpart C",
};

function referenceFor(label: string): string {
  const lower = label.toLowerCase();
  if (lower.includes("gfci") || lower.includes("circuit") || lower.includes("energized") || lower.includes("loto")) {
    return REGULATORY_REFERENCES.electrical;
  }
  if (lower.includes("ppe") || lower.includes("hard hat") || lower.includes("vest") || lower.includes("protection")) {
    return REGULATORY_REFERENCES.ppe;
  }
  if (lower.includes("housekeeping") || lower.includes("storage")) {
    return REGULATORY_REFERENCES.housekeeping;
  }
  if (lower.includes("egress")) {
    return REGULATORY_REFERENCES.egress;
  }
  if (lower.includes("guardrail") || lower.includes("fall")) {
    return REGULATORY_REFERENCES.fall;
  }
  return REGULATORY_REFERENCES.default;
}

function riskFor(label: string): RiskLevel {
  const lower = label.toLowerCase();
  if (lower.includes("energized") || lower.includes("loto") || lower.includes("fall") || lower.includes("emergency stop")) {
    return "critical";
  }
  if (lower.includes("gfci") || lower.includes("circuit") || lower.includes("guardrail")) {
    return "high";
  }
  if (lower.includes("ppe") || lower.includes("vest") || lower.includes("hard hat")) {
    return "medium";
  }
  return "low";
}

export function analyzeInspection(
  template: InspectionTemplate,
  responses: ChecklistResponse[],
  inspectionId: string
): Array<Omit<Finding, "id">> {
  if (!template.aiAnalysisEnabled) return [];

  const failed = responses.filter((r) => r.value === "fail");

  return failed.map((response) => {
    const item = template.checklist.find((c) => c.id === response.itemId);
    const label = item?.label ?? "Unspecified hazard";
    const confidence = 0.7 + (label.length % 5) * 0.05;

    return {
      inspectionId,
      hazardCategory: label,
      aiConfidence: Math.min(confidence, 0.97),
      riskLevel: riskFor(label),
      aiExplanation: `Checklist item "${label}" was marked as failed${
        response.note ? ` — inspector note: "${response.note}"` : ""
      }. Flagged for safety-professional review before any determination is made.`,
      regulatoryReference: referenceFor(label),
      reviewerDecision: "pending",
      createdAt: new Date().toISOString(),
    };
  });
}
