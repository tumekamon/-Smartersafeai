"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { getFinding, reviewFinding as dbReviewFinding } from "@/lib/db";
import type { ReviewerDecision } from "@/lib/types";

export async function reviewFindingAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!getCapabilities(user.role).canReviewFindings) {
    throw new Error("Only safety professionals can review AI findings.");
  }

  const findingId = String(formData.get("findingId") ?? "");
  const decision = String(formData.get("decision") ?? "") as ReviewerDecision;
  const overrideReason = String(formData.get("overrideReason") ?? "").trim();

  const finding = getFinding(findingId);
  if (!finding) return;

  if (decision === "overridden" && !overrideReason) {
    throw new Error("An override reason is required.");
  }

  dbReviewFinding(findingId, {
    decision,
    reviewerId: user.id,
    overrideReason: overrideReason || undefined,
  });

  revalidatePath(`/inspections/${finding.inspectionId}`);
}
