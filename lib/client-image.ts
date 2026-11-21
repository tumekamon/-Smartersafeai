/**
 * Browser only. Redraws a photo as a JPEG no larger than `maxEdge` px: big phone photos
 * shrink to a few hundred KB, location data in the file is dropped, and HEIC/PNG all
 * end up the same. Throws "unreadable" or "too-big".
 */
export async function toJpeg(file: File, { maxEdge = 2000, maxBytes = 3.6 * 1024 * 1024, name = "photo.jpg" } = {}): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => {
    throw new Error("unreadable");
  });
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.86, 0.75, 0.6]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (blob && blob.size <= maxBytes) return new File([blob], name, { type: "image/jpeg" });
  }
  throw new Error("too-big");
}
