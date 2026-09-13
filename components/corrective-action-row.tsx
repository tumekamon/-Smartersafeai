"use client";

import { updateCorrectiveActionStatusAction } from "@/lib/actions/corrective-actions";
import { CorrectiveActionStatusBadge } from "@/components/ui/badges";
import type { Capabilities } from "@/lib/authz";
import type { CorrectiveAction, CorrectiveActionStatus, Project, User } from "@/lib/types";

const NEXT_STATUS: Record<CorrectiveActionStatus, { next: CorrectiveActionStatus; label: string } | null> = {
  open: { next: "completed", label: "Mark completed" },
  completed: { next: "verified", label: "Verify fix" },
  verified: { next: "closed", label: "Close out" },
  closed: null,
};

export function CorrectiveActionRow({
  action,
  project,
  assignee,
  currentUserId,
  capabilities,
}: {
  action: CorrectiveAction;
  project?: Project;
  assignee?: User;
  currentUserId: string;
  capabilities: Capabilities;
}) {
  const overdue =
    (action.status === "open" || action.status === "completed") &&
    new Date(action.dueDate) < new Date();
  const next = NEXT_STATUS[action.status];
  const isAssignee = action.assignedToId === currentUserId;

  const canAdvance =
    !!next &&
    ((next.next === "completed" && capabilities.canCompleteOwnActions && (isAssignee || capabilities.canVerifyActions)) ||
      (next.next === "verified" && capabilities.canVerifyActions) ||
      (next.next === "closed" && capabilities.canCloseActions));

  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-3 pr-3">
        <p className="text-sm font-medium">{action.description}</p>
        <p className="text-xs text-foreground/50">{project?.name}</p>
      </td>
      <td className="py-3 pr-3 text-sm">
        {assignee?.firstName} {assignee?.lastName}
      </td>
      <td className="py-3 pr-3 text-sm">
        <span className={overdue ? "font-medium text-critical" : ""}>
          {action.dueDate}
        </span>
      </td>
      <td className="py-3 pr-3">
        <CorrectiveActionStatusBadge status={action.status} />
      </td>
      {!capabilities.isReadOnly && (
        <td className="py-3 text-right">
          {canAdvance && next && (
            <form action={updateCorrectiveActionStatusAction}>
              <input type="hidden" name="correctiveActionId" value={action.id} />
              <input type="hidden" name="status" value={next.next} />
              <button
                type="submit"
                className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:border-sidebar-accent hover:text-sidebar-accent"
              >
                {next.label}
              </button>
            </form>
          )}
        </td>
      )}
    </tr>
  );
}
