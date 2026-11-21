"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import {
  createCorrectiveAction as dbCreateCorrectiveAction,
  getCorrectiveAction,
  getFinding,
  getProject,
  getUser,
  sendBackCorrectiveAction,
  updateCorrectiveActionStatus,
} from "@/lib/db";
import { accessibleProject, worksOnSite } from "@/lib/scope";
import { visibleTask } from "@/lib/task-access";
import type { CorrectiveAction, CorrectiveActionStatus, HazardCategory, RiskLevel } from "@/lib/types";

export type TaskFormState = { error?: string } | undefined;

export async function createCorrectiveActionAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!getCapabilities(user).canCreateCorrectiveActions) {
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

  const project = accessibleProject(user, projectId);
  if (!project) throw new Error("Project not found.");
  // A fix can only go to someone who works on that site.
  const assignee = getUser(assignedToId);
  if (!assignee || !worksOnSite(assignee, project)) throw new Error("Assign the fix to someone on this site's crew.");

  const finding = findingId ? getFinding(findingId) : undefined;
  if (finding && finding.projectId !== projectId) throw new Error("Finding does not match project.");

  dbCreateCorrectiveAction({
    projectId,
    source: finding ? "finding" : "manual",
    findingId: finding?.id,
    category: (finding?.hazardCategory ?? "Housekeeping") as HazardCategory,
    priority: (finding?.riskLevel ?? "medium") as RiskLevel,
    location: finding?.location,
    description,
    assignedToId,
    assignedById: user.id,
    dueDate,
  });

  if (finding) revalidatePath(`/inspections/${finding.inspectionId}`);
  revalidatePath("/corrective-actions");
  revalidatePath("/review");
  revalidatePath("/dashboard");
  revalidatePath(`/projects/${projectId}`);
  redirect("/corrective-actions");
}

function revalidateTask(a: CorrectiveAction) {
  revalidatePath("/corrective-actions");
  revalidatePath(`/corrective-actions/${a.id}`);
  revalidatePath("/dashboard");
  revalidatePath(`/projects/${a.projectId}`);
}

/** For the checker (L3+): the fix isn't good enough. Back to the assignee with a reason. */
export async function sendBackTaskAction(_state: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const user = await getCurrentUser();
  if (!getCapabilities(user).canVerifyActions) return { error: "You can't check fixes." };
  const action = visibleTask(user, String(formData.get("correctiveActionId") ?? ""));
  if (!action) return { error: "Task not found." };
  if (action.status !== "completed") return { error: "Only a fix waiting for a check can be sent back." };
  const note = String(formData.get("note") ?? "").trim().slice(0, 300);
  if (!note) return { error: "Say what still needs doing." };

  sendBackCorrectiveAction(action.id, { byId: user.id, note });
  revalidateTask(action);
  return {};
}

/** Verify and close. Marking done goes through completeTask (lib/task-complete.ts), which needs proof. */
export async function updateCorrectiveActionStatusAction(formData: FormData) {
  const user = await getCurrentUser();
  const capabilities = getCapabilities(user);

  const id = String(formData.get("correctiveActionId") ?? "");
  const status = String(formData.get("status") ?? "") as CorrectiveActionStatus;

  const action = getCorrectiveAction(id);
  if (!action) return;
  const actionProject = getProject(action.projectId);
  if (!actionProject || actionProject.companyId !== user.companyId) return;
  if (!accessibleProject(user, action.projectId)) return;

  const allowed =
    (status === "verified" && capabilities.canVerifyActions && action.status === "completed") ||
    (status === "closed" && capabilities.canCloseActions && action.status === "verified");

  if (!allowed) {
    throw new Error("Your role cannot move this corrective action to that status.");
  }

  updateCorrectiveActionStatus(id, status);
  revalidateTask(action);
}
