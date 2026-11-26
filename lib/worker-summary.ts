import "server-only";
import type { Certification, User } from "@/lib/types";
import { listCertificationRecords, listCertifications } from "@/lib/db";
import { certReview } from "@/lib/certifications";
import { certStatus } from "@/lib/metrics";

/**
 * A worker's certificates in one pass: what's on file (one per type, the verified one that
 * runs longest), how many are valid, and which need action: expired or expiring within
 * 30 days, not counting ones whose renewal is already waiting to be checked.
 */
export function certSummary(user: Pick<User, "id" | "companyId">, now: number) {
  const held: Certification[] = listCertifications(user.companyId).filter((c) => c.userId === user.id);
  const renewing = new Set(
    listCertificationRecords(user.companyId, { userId: user.id })
      .filter((c) => certReview(c) === "pending")
      .map((c) => c.type)
  );
  const due = held
    .filter((c) => certStatus(c.expiresOn, now) !== "current" && !renewing.has(c.type))
    .sort((a, b) => a.expiresOn.localeCompare(b.expiresOn));
  const valid = held.filter((c) => certStatus(c.expiresOn, now) !== "expired").length;
  return { held, due, valid, renewing: renewing.size };
}
