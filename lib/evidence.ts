import "server-only";
import type { Evidence } from "@/lib/types";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** Turns uploaded photos into inline evidence; returns an error message for an oversized file. */
export async function readEvidence(formData: FormData, field = "evidence"): Promise<{ evidence: Evidence[]; error?: string }> {
  const files = formData
    .getAll(field)
    .filter((file): file is File => file instanceof File && file.size > 0);

  const evidence: Evidence[] = [];
  for (const [index, file] of files.entries()) {
    if (file.size > MAX_IMAGE_BYTES) {
      return { evidence: [], error: `${file.name} is larger than 4 MB.` };
    }
    const bytes = Buffer.from(await file.arrayBuffer()).toString("base64");
    evidence.push({
      id: `ev_${Date.now()}_${index}`,
      fileName: file.name,
      dataUrl: `data:${file.type || "image/jpeg"};base64,${bytes}`,
      capturedAt: new Date().toISOString(),
    });
  }
  return { evidence };
}
