import "server-only";
import type { Evidence } from "@/lib/types";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/**
 * Drops the EXIF/XMP blocks (APP1) from a JPEG: phones put GPS position, device and
 * owner details there, none of which a safety report needs. Pixels are untouched;
 * anything that isn't a well-formed JPEG is returned as is.
 */
export function stripJpegMetadata(buf: Buffer): Buffer {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return buf;
  const parts: Buffer[] = [buf.subarray(0, 2)];
  let i = 2;
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff) return buf;
    const marker = buf[i + 1];
    if (marker === 0xda) {
      parts.push(buf.subarray(i));
      return Buffer.concat(parts);
    }
    const len = buf.readUInt16BE(i + 2);
    if (len < 2 || i + 2 + len > buf.length) return buf;
    if (marker !== 0xe1) parts.push(buf.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  return buf;
}

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
    const raw = Buffer.from(await file.arrayBuffer());
    const bytes = (/jpe?g/i.test(file.type) ? stripJpegMetadata(raw) : raw).toString("base64");
    evidence.push({
      id: `ev_${Date.now()}_${index}`,
      fileName: file.name,
      dataUrl: `data:${file.type || "image/jpeg"};base64,${bytes}`,
      capturedAt: new Date().toISOString(),
    });
  }
  return { evidence };
}
