"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { createCorrectiveAction, getFinding, reviewFinding as dbReviewFinding } from "@/lib/db";
import type { ReviewerDecision, RiskLevel } from "@/lib/types";

const RISK_LEVELS: RiskLevel[] = ["low", "medium", "high", "critical"];

export async function reviewFindingAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!getCapabilities(user.role).canReviewFindings) {
    throw new Error("Only safety professionals can review AI findings.");
  }

  const findingId = String(formData.get("findingId") ?? "");
  const decision = String(formData.get("decision") ?? "") as ReviewerDecision;
  const overrideReason = String(formData.get("overrideReason") ?? "").trim();
  const riskRaw = String(formData.get("riskLevel") ?? "") as RiskLevel;

  const finding = getFinding(findingId);
  if (!finding) return;

  if (decision === "overridden" && !overrideReason) {
    throw new Error("An override reason is required.");
  }

  const reviewed = dbReviewFinding(findingId, {
    decision,
    reviewerId: user.id,
    overrideReason: overrideReason || undefined,
    riskLevel: decision === "overridden" && RISK_LEVELS.includes(riskRaw) ? riskRaw : undefined,
  });

  const assignedToId = String(formData.get("assignedToId") ?? "");
  const dueDate = String(formData.get("dueDate") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  if (
    reviewed &&
    (decision === "approved" || decision === "overridden") &&
    assignedToId &&
    dueDate &&
    description &&
    !reviewed.correctiveActionId &&
    getCapabilities(user.role).canCreateCorrectiveActions
  ) {
    createCorrectiveAction({
      projectId: reviewed.projectId,
      source: "finding",
      findingId: reviewed.id,
      category: reviewed.hazardCategory,
      priority: reviewed.riskLevel,
      location: reviewed.location,
      description,
      assignedToId,
      dueDate,
    });
  }

  revalidatePath(`/inspections/${finding.inspectionId}`);
  revalidatePath("/review");
  revalidatePath("/dashboard");
  revalidatePath("/corrective-actions");

  const next = String(formData.get("next") ?? "");
  if (next.startsWith("/") && !next.startsWith("//")) redirect(next);
}
