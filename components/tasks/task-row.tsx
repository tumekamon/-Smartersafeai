import Link from "next/link";
import type { CorrectiveAction } from "@/lib/types";
import { getUser } from "@/lib/db";
import { PRIORITY_DOT, TASK_SOURCE, countdown, taskTitle } from "@/lib/tasks";

const TONE = { critical: "tone-critical", warning: "tone-warning", neutral: "text-muted" } as const;

/**
 * One task as a flat row (design canvas W02, W06): priority dot, title, who it's from
 * and where, and a mono countdown on the right. The whole row opens the task.
 */
export function TaskRow({ task: a, now }: { task: CorrectiveAction; now: number }) {
  const from = a.assignedById ? getUser(a.assignedById) : undefined;
  const sentBackBy = a.status === "open" && a.sentBack ? getUser(a.sentBack.byId) : undefined;
  const source = from ? `From ${from.firstName} ${from.lastName}` : TASK_SOURCE[a.source].label;
  const where = a.location ? `${a.location.level} ${a.location.zone}` : undefined;
  const left = a.status === "open" ? countdown(a, now) : undefined;

  return (
    <Link href={`/corrective-actions/${a.id}`} className="ds-row group">
      <span aria-hidden="true" className="ds-dot" style={{ background: PRIORITY_DOT[a.priority] }} />
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="text-base font-semibold leading-snug group-hover:underline">{taskTitle(a)}</span>
        <span className="text-sm text-body">
          {a.status === "open" && a.sentBack ? (
            <span className="font-medium tone-critical">Sent back{sentBackBy ? ` by ${sentBackBy.firstName}` : ""}</span>
          ) : (
            source
          )}
          {where && ` · ${where}`}
        </span>
      </span>
      {left ? (
        <span className={`eyebrow shrink-0 ${TONE[left.tone]}`}>
          {left.text}
        </span>
      ) : a.status === "completed" ? (
        <span className="ds-tag ds-tag-info shrink-0">Checking</span>
      ) : (
        <span className="ds-tag ds-tag-good shrink-0">Done</span>
      )}
    </Link>
  );
}
