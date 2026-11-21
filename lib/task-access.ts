import "server-only";
import { getCapabilities } from "@/lib/authz";
import { getCorrectiveAction } from "@/lib/db";
import { accessibleProject } from "@/lib/scope";
import { tasksOnly } from "@/lib/tasks";
import type { CorrectiveAction, User } from "@/lib/types";

/**
 * The task if this person may see it: it must be on one of their sites, and a worker
 * without extra rights only sees tasks assigned to them.
 */
export function visibleTask(user: User, id: string): CorrectiveAction | undefined {
  const action = getCorrectiveAction(id);
  if (!action || !accessibleProject(user, action.projectId)) return undefined;
  if (tasksOnly(user, getCapabilities(user)) && action.assignedToId !== user.id) return undefined;
  return action;
}
