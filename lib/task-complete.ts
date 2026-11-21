import "server-only";
import { getCapabilities } from "@/lib/authz";
import { completeCorrectiveAction } from "@/lib/db";
import { stripJpegMetadata } from "@/lib/evidence";
import { visibleTask } from "@/lib/task-access";
import { photoProof } from "@/lib/tasks";
import type { CorrectiveAction, Evidence, User } from "@/lib/types";

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

/**
 * "It's fixed". Physical fixes need a photo of the fixed spot (the checker compares it
 * with the hazard); jobs without one need a note saying what was done. The assignee
 * does this; a supervisor may on their behalf. Shared by the form's server action and
 * the phone's offline outbox (app/api/outbox/task).
 */
export async function completeTask(user: User, formData: FormData): Promise<{ error: string } | { task: CorrectiveAction }> {
  const caps = getCapabilities(user);
  const action = visibleTask(user, String(formData.get("correctiveActionId") ?? ""));
  if (!action) return { error: "Task not found." };
  if (action.status !== "open") return { error: "This task is already marked as done." };
  const mine = action.assignedToId === user.id;
  if (!caps.canCompleteOwnActions || (!mine && !caps.canVerifyActions)) return { error: "Only the person it's assigned to can mark it done." };

  const proof = photoProof(action);
  const note = String(formData.get("note") ?? "").trim().slice(0, 500) || undefined;
  const file = formData.get("photo");
  const hasFile = proof !== "disabled" && file instanceof File && file.size > 0;
  if (proof === "required" && !hasFile) return { error: "Add a photo of the fixed spot." };
  // No photo: the note is the proof.
  if (!hasFile && !note) return { error: "Write what you did, so your supervisor can approve it." };

  let photo: Evidence | undefined;
  if (hasFile) {
    if (file.size > MAX_PHOTO_BYTES) return { error: "That photo is too large. Take it again." };
    const raw = Buffer.from(await file.arrayBuffer());
    if (!(raw[0] === 0xff && raw[1] === 0xd8 && raw[2] === 0xff)) return { error: "That file isn't a photo." };
    photo = {
      id: `ev_${Date.now()}`,
      fileName: "fixed.jpg",
      dataUrl: `data:image/jpeg;base64,${stripJpegMetadata(raw).toString("base64")}`,
      capturedAt: new Date().toISOString(),
    };
  }

  completeCorrectiveAction(action.id, { byId: user.id, note, photo });
  return { task: action };
}
