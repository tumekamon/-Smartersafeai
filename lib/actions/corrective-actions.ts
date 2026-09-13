"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import {
  createCorrectiveAction as dbCreateCorrectiveAction,
  getCorrectiveAction,
  getFinding,
  updateCorrectiveActionStatus,
} from "@/lib/db";
import type { CorrectiveActionStatus } from "@/lib/types";

export async function createCorrectiveActionAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!getCapabilities(user.role).canCreateCorrectiveActions) {
    throw new Error("Your role cannot create corrective actions.");
  }

  const projectId = String(formData.get("projectId") ?? "");
  const findingId = String(formData.get("findingId") ?? "") || undefined;
  const description = String(formData.get("description") ?? "").trim();
  const assignedToId = String(formData.get("assignedToId") ?? "");
  const dueDate = String(formData.get("dueDate") ?? "");

  if (!projectId || !description || !assignedToId || !dueDate) {
    throw new Error("Missing required corrective action fields.");
  }

  dbCreateCorrectiveAction({
    projectId,
    source: findingId ? "finding" : "manual",
    findingId,
    description,
    assignedToId,
    dueDate,
  });

  if (findingId) {
    const finding = getFinding(findingId);
    if (finding) revalidatePath(`/inspections/${finding.inspectionId}`);
  }
  revalidatePath("/corrective-actions");
  revalidatePath(`/projects/${projectId}`);
}

export async function updateCorrectiveActionStatusAction(formData: FormData) {
  const user = await getCurrentUser();
  const capabilities = getCapabilities(user.role);

  const id = String(formData.get("correctiveActionId") ?? "");
  const status = String(formData.get("status") ?? "") as CorrectiveActionStatus;

  const action = getCorrectiveAction(id);
  if (!action) return;

  const isAssignee = action.assignedToId === user.id;

  const allowed =
    (status === "completed" && capabilities.canCompleteOwnActions && (isAssignee || capabilities.canVerifyActions)) ||
    (status === "verified" && capabilities.canVerifyActions) ||
    (status === "closed" && capabilities.canCloseActions);

  if (!allowed) {
    throw new Error("Your role cannot move this corrective action to that status.");
  }

  updateCorrectiveActionStatus(id, status);

  revalidatePath("/corrective-actions");
}
