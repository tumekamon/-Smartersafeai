"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { createCertification, deleteCertification, getCertification, listCertificationRecords, reviewCertification } from "@/lib/db";
import { peopleFor } from "@/lib/scope";
import { stripJpegMetadata } from "@/lib/evidence";
import { CERT_FILE_MAX_BYTES, certReview, effectiveCertifications, isCertificationType } from "@/lib/certifications";

export type CertificationUploadState = { error?: string } | undefined;

const DAY = 86_400_000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** What the bytes really are; the browser's claimed type is not trusted. */
function sniff(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: "image/png", ext: "png" };
  if (buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return { mime: "image/webp", ext: "webp" };
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return { mime: "application/pdf", ext: "pdf" };
  return null;
}

/**
 * A person sends one of their own certificates. It's stored as "pending" and only
 * counts once a supervisor or safety manager has checked it against the document.
 */
export async function submitCertificationAction(
  _state: CertificationUploadState,
  formData: FormData
): Promise<CertificationUploadState> {
  const user = await getCurrentUser();
  if (user.readOnly) return { error: "Your account can't add certificates." };

  const type = String(formData.get("type") ?? "");
  if (!isCertificationType(type)) return { error: "Choose the type of certificate." };

  const issuedOn = String(formData.get("issuedOn") ?? "");
  const expiresOn = String(formData.get("expiresOn") ?? "");
  if (!DATE.test(issuedOn) || !DATE.test(expiresOn)) return { error: "Enter the issue and expiry dates from the certificate." };
  const issued = Date.parse(`${issuedOn}T00:00:00Z`);
  const expires = Date.parse(`${expiresOn}T00:00:00Z`);
  const now = Date.now();
  if (Number.isNaN(issued) || Number.isNaN(expires)) return { error: "Those dates aren't valid." };
  if (issued > now + DAY) return { error: "The issue date can't be in the future." };
  if (expires <= issued) return { error: "The expiry date must be after the issue date." };
  if (expires + DAY < now) return { error: "This certificate has already expired. Upload your renewed one instead." };

  const certificateNo = String(formData.get("certificateNo") ?? "").trim().slice(0, 40) || undefined;
  const issuer = String(formData.get("issuer") ?? "").trim().slice(0, 80) || undefined;
  if (formData.get("confirm") !== "on") return { error: "Confirm the certificate is yours and the details match it." };

  const mine = listCertificationRecords(user.companyId, { userId: user.id });
  if (mine.some((c) => c.type === type && certReview(c) === "pending")) {
    return { error: `Your ${type} certificate is already waiting for review. Withdraw it first to send a different one.` };
  }
  const onFile = effectiveCertifications(mine).find((c) => c.type === type);
  if (onFile && onFile.expiresOn >= expiresOn) {
    return { error: `You already have a ${type} certificate on file that's valid until ${onFile.expiresOn}.` };
  }

  const file = formData.get("document");
  if (!(file instanceof File) || file.size === 0) return { error: "Add a photo or PDF of the certificate." };
  if (file.size > CERT_FILE_MAX_BYTES) return { error: "That file is larger than 4 MB. Take a photo instead, or use a smaller PDF." };
  const raw = Buffer.from(await file.arrayBuffer());
  const kind = sniff(raw);
  if (!kind) return { error: "Only photos (JPG, PNG, WebP) or PDF files are accepted." };
  const bytes = kind.mime === "image/jpeg" ? stripJpegMetadata(raw) : raw;

  const submittedAt = new Date().toISOString();
  createCertification({
    userId: user.id,
    type,
    issuedOn,
    expiresOn,
    certificateNo,
    issuer,
    review: "pending",
    submittedById: user.id,
    submittedAt,
    document: {
      id: `doc_${now}`,
      fileName: `${type.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "")}.${kind.ext}`,
      dataUrl: `data:${kind.mime};base64,${bytes.toString("base64")}`,
      mimeType: kind.mime,
      sizeBytes: bytes.length,
      capturedAt: submittedAt,
    },
  });

  revalidatePath("/settings/profile");
  revalidatePath("/dashboard");
  redirect("/settings/profile?sent=1#certs");
}

/** Take back an upload that hasn't been reviewed yet (wrong file, typo in a date). */
export async function withdrawCertificationAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const cert = getCertification(String(formData.get("certificationId") ?? ""));
  if (cert && cert.userId === user.id && certReview(cert) === "pending") deleteCertification(cert.id);
  revalidatePath("/settings/profile");
  revalidatePath("/dashboard");
}

/**
 * Accept or turn down an uploaded certificate. For the supervisor / safety manager
 * screens: L1–L3, only for people on their own sites, never their own upload, and a
 * reason is required to turn one down so the worker knows what to fix.
 */
export async function reviewCertificationAction(formData: FormData): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  const caps = getCapabilities(user);
  if (!caps.canReviewCheckIns && !caps.canManageCompliance) return { error: "You can't review certificates." };

  const cert = getCertification(String(formData.get("certificationId") ?? ""));
  if (!cert || !peopleFor(user).some((p) => p.id === cert.userId)) return { error: "Certificate not found." };
  if (cert.userId === user.id) return { error: "Someone else has to review your own certificate." };
  if (certReview(cert) !== "pending") return { error: "This certificate has already been reviewed." };

  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || undefined;
  if (decision !== "verified" && decision !== "rejected") return { error: "Choose accept or reject." };
  if (decision === "rejected" && !note) return { error: "Say why, so the worker knows what to fix." };

  reviewCertification(cert.id, { review: decision, reviewedById: user.id, reviewNote: note });
  revalidatePath("/compliance");
  revalidatePath("/dashboard");
  revalidatePath("/settings/profile");
  return {};
}
