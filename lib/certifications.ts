import type { Certification, CertificationReview, CertificationType } from "@/lib/types";

/** The certifications the app tracks, with what each one allows on site. */
export const CERTIFICATION_TYPES: { type: CertificationType; covers: string }[] = [
  { type: "Electrical Safety (NFPA 70E)", covers: "Work on or near live electrical equipment" },
  { type: "LOTO Authorized", covers: "Lock out and tag out equipment before work" },
  { type: "Fall Protection", covers: "Work at height with a harness" },
  { type: "Aerial Lift Operator", covers: "Operate scissor and boom lifts" },
  { type: "First Aid / CPR", covers: "Give first aid until help arrives" },
  { type: "HAZCOM", covers: "Handle chemicals and read safety data sheets" },
];

export const isCertificationType = (v: string): v is CertificationType =>
  CERTIFICATION_TYPES.some((c) => c.type === v);

/** Files the worker can send: phone photos are re-encoded to JPEG in the browser first. */
export const CERT_FILE_MAX_BYTES = 4 * 1024 * 1024;
export const CERT_FILE_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

export const certReview = (c: Certification): CertificationReview => c.review ?? "verified";

/**
 * The records that count: verified only, and per person and type the one that runs
 * longest, so a verified renewal replaces the old card everywhere.
 */
export function effectiveCertifications(certs: Certification[]): Certification[] {
  const best = new Map<string, Certification>();
  for (const c of certs) {
    if (certReview(c) !== "verified") continue;
    const key = `${c.userId}|${c.type}`;
    const prev = best.get(key);
    if (!prev || c.expiresOn > prev.expiresOn) best.set(key, c);
  }
  return [...best.values()];
}

/** One line per certification type for one person: what counts, plus any upload in flight. */
export type CertificationSlot = {
  type: CertificationType;
  covers: string;
  current?: Certification;
  pending?: Certification;
  /** The last upload that wasn't accepted, when nothing newer has been sent since. */
  rejected?: Certification;
};

export function certificationSlots(certs: Certification[]): CertificationSlot[] {
  const current = effectiveCertifications(certs);
  const bySubmitted = [...certs].sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""));
  return CERTIFICATION_TYPES.map(({ type, covers }) => {
    const latestUpload = bySubmitted.find((c) => c.type === type && c.submittedAt);
    return {
      type,
      covers,
      current: current.find((c) => c.type === type),
      pending: bySubmitted.find((c) => c.type === type && certReview(c) === "pending"),
      rejected: latestUpload && certReview(latestUpload) === "rejected" ? latestUpload : undefined,
    };
  });
}

export function formatBytes(n: number) {
  return n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}
