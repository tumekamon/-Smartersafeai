import Link from "next/link";
import type { CorrectiveAction, RiskLevel } from "@/lib/types";
import { getUser } from "@/lib/db";
import { PRIORITY, PRIORITY_DOT, TASK_SOURCE, countdown, taskTitle } from "@/lib/tasks";
import { Avatar } from "@/components/ui/avatar";
import { IconCheck, IconChevronRight, IconClock, IconMapPin } from "@/components/ui/icons";

const TAG = { critical: "ds-tag-crit", warning: "ds-tag-warn", neutral: "ds-tag-neutral" } as const;
const PRIORITY_TAG: Record<RiskLevel, string> = {
  critical: "ds-tag-crit",
  high: "ds-tag-crit",
  medium: "ds-tag-warn",
  low: "ds-tag-info",
};

const dayLabel = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/** "Due 11:30 today", "Due Thu 26 Nov". */
function dueText(a: CorrectiveAction, now: number) {
  if (a.dueAt) {
    const sameDay = new Date(a.dueAt).toDateString() === new Date(now).toDateString();
    return `Due ${clock(a.dueAt)}${sameDay ? " today" : `, ${dayLabel(a.dueAt)}`}`;
  }
  return `Due ${dayLabel(`${a.dueDate}T12:00:00`)}`;
}

export function PriorityTag({ level }: { level: RiskLevel }) {
  return (
    <span className={`ds-tag ${PRIORITY_TAG[level]} gap-1.5`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {PRIORITY[level].label}
    </span>
  );
}

/** Column heads for the full (table) layout on large screens. */
export function TaskTableHead() {
  return (
    <div
      aria-hidden="true"
      className="hidden grid-cols-[minmax(0,1fr)_6rem_7rem_8rem_1rem] items-center gap-4 border-b border-border bg-surface-muted/60 px-5 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted lg:grid"
    >
      <span>Task</span>
      <span>Priority</span>
      <span>Where</span>
      <span className="text-right">Due</span>
      <span />
    </div>
  );
}

/**
 * One task, used everywhere a worker sees tasks.
 * - Full: a table row on large screens (task with source and who it is from · priority ·
 *   where · due), a
 *   two-line card row on phones.
 * - Compact: always the two-line row (dashboard card).
 * The priority colour runs down the left edge; sent-back tasks show the reason.
 */
export function TaskListRow({ task: a, now, compact = false }: { task: CorrectiveAction; now: number; compact?: boolean }) {
  const from = a.assignedById ? getUser(a.assignedById) : undefined;
  const sentBackBy = a.status === "open" && a.sentBack ? getUser(a.sentBack.byId) : undefined;
  const where = a.location ? `${a.location.level} · ${a.location.zone}` : undefined;
  const left = a.status === "open" ? countdown(a, now) : undefined;
  const wide = !compact;

  const status =
    a.status === "open" ? (
      <span className={`ds-tag ${TAG[left!.tone]}`}>{left!.text}</span>
    ) : a.status === "completed" ? (
      <span className="ds-tag ds-tag-info gap-1">
        <IconClock width={11} height={11} /> Checking
      </span>
    ) : (
      <span className="ds-tag ds-tag-good gap-1">
        <IconCheck width={11} height={11} strokeWidth={2.6} /> {a.status === "closed" ? "Closed" : "Approved"}
      </span>
    );
  const statusSub =
    a.status === "open"
      ? dueText(a, now)
      : a.status === "completed"
        ? `Sent ${dayLabel(a.completedAt ?? a.createdAt)}`
        : dayLabel(a.verifiedAt ?? a.closedAt ?? a.createdAt);

  return (
    <Link
      href={`/corrective-actions/${a.id}`}
      className={`group relative flex items-center gap-3 py-3.5 pl-5 pr-3 transition-colors hover:bg-surface-muted/70 sm:pr-4 ${
        wide ? "lg:grid lg:grid-cols-[minmax(0,1fr)_6rem_7rem_8rem_1rem] lg:gap-4 lg:pr-5" : ""
      }`}
    >
      <span aria-hidden="true" className="absolute inset-y-3 left-0 w-1 rounded-r-full" style={{ background: PRIORITY_DOT[a.priority] }} />

      {/* Task: title, then (phones / compact) priority, source and place. */}
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className={`text-[15px] font-semibold leading-snug group-hover:text-brand ${wide ? "line-clamp-2 lg:line-clamp-1" : "line-clamp-2"}`}>{taskTitle(a)}</span>
        <span className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-body ${wide ? "lg:hidden" : ""}`}>
          {a.sentBack && a.status === "open" ? (
            <span className="ds-tag ds-tag-crit">Sent back</span>
          ) : (
            <PriorityTag level={a.priority} />
          )}
          <span>{TASK_SOURCE[a.source].label}</span>
          {where && (
            <span className="inline-flex items-center gap-1">
              <IconMapPin width={12} height={12} />
              {where}
            </span>
          )}
        </span>
        {wide && (
          <span className="hidden items-center gap-1.5 text-[13px] text-body lg:flex">
            {a.sentBack && a.status === "open" && <span className="font-medium tone-critical">Sent back ·</span>}
            {TASK_SOURCE[a.source].label}
            <span aria-hidden="true">·</span>
            {from ? (
              <>
                <Avatar person={from} size={18} />
                {from.firstName} {from.lastName.charAt(0)}.
              </>
            ) : (
              "Safety team"
            )}
          </span>
        )}
        {a.sentBack && a.status === "open" && (
          <span className="line-clamp-1 text-[13px] text-body">
            &ldquo;{a.sentBack.note}&rdquo;{sentBackBy ? ` · ${sentBackBy.firstName}` : ""}
          </span>
        )}
      </span>

      {wide && (
        <>
          <span className="hidden lg:block">
            <PriorityTag level={a.priority} />
          </span>
          <span className="hidden truncate text-sm lg:block">{where ?? "—"}</span>
        </>
      )}

      {/* Due / status, right-aligned. */}
      <span className="flex shrink-0 flex-col items-end gap-1 text-right">
        {status}
        <span className="whitespace-nowrap text-[12px] text-body">{statusSub}</span>
      </span>
      <IconChevronRight width={16} height={16} className="hidden shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-foreground sm:block" />
    </Link>
  );
}
