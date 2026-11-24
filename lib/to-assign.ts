import "server-only";
import { listFindings } from "@/lib/db";
import { siteIdsFor } from "@/lib/scope";
import type { Finding, User } from "@/lib/types";

/**
 * Flow rule 2: a confirmed hazard (approved or re-rated by safety, or a failed checklist
 * item, rule 1) waits on the site supervisor's "To assign" list until someone is picked.
 * Only findings on this person's sites; most serious and oldest first.
 */
export function findingsToAssign(user: User): Finding[] {
  const sites = siteIdsFor(user);
  const rank = { critical: 0, high: 1, medium: 2, low: 3 } as const;
  return listFindings(user.companyId)
    .filter(
      (f) =>
        sites.has(f.projectId) &&
        (f.reviewerDecision === "approved" || f.reviewerDecision === "overridden") &&
        !f.correctiveActionId
    )
    .sort((a, b) => rank[a.riskLevel] - rank[b.riskLevel] || (a.reviewedAt ?? a.createdAt).localeCompare(b.reviewedAt ?? b.createdAt));
}
