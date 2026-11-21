import Link from "next/link";
import type { CorrectiveAction } from "@/lib/types";
import { PRIORITY, TASK_SOURCE, dueLabel, taskTitle } from "@/lib/tasks";
import { shortDate } from "@/lib/format";
import { IconArrowRight, IconCheck, IconClock, IconMapPin } from "@/components/ui/icons";

const TONE = { critical: "badge-critical", warning: "badge-warning", neutral: "badge-neutral" } as const;

/** One task in a worker's list. The whole card opens the task. */
export function TaskCard({ task: a, now, siteName }: { task: CorrectiveAction; now: number; siteName?: string }) {
  const p = PRIORITY[a.priority];
  const due = dueLabel(a, now);
  const sentBack = a.status === "open" && a.sentBack;

  return (
    <Link
      href={`/corrective-actions/${a.id}`}
      className="group relative flex items-stretch gap-4 overflow-hidden rounded-2xl border border-border bg-surface p-4 pl-5 transition-all hover:border-foreground/20 hover:shadow-lg hover:shadow-black/5"
    >
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5" style={{ background: p.color }} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold uppercase tracking-wider">
          <span style={{ color: p.color }}>{p.label}</span>
          <span className="text-foreground/25">•</span>
          <span className="text-foreground/50">{TASK_SOURCE[a.source].label}</span>
        </div>
        <p className="mt-1 text-[15px] font-semibold leading-snug sm:text-base">{taskTitle(a)}</p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground/55">
          {(a.location || siteName) && (
            <span className="inline-flex items-center gap-1">
              <IconMapPin width={13} height={13} />
              {[siteName, a.location && `${a.location.level} ${a.location.zone}`].filter(Boolean).join(" · ")}
            </span>
          )}
        </p>
        {sentBack && (
          <p className="mt-2.5 rounded-lg bg-status-critical/10 px-2.5 py-1.5 text-xs font-medium text-status-critical">
            <span className="font-bold">Sent back:</span> {a.sentBack!.note}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between gap-2">
        {a.status === "open" ? (
          <span className={`badge ${TONE[due.tone]}`}>{due.text}</span>
        ) : a.status === "completed" ? (
          <span className="badge badge-info inline-flex items-center gap-1">
            <IconClock width={12} height={12} /> Being checked
          </span>
        ) : (
          <span className="badge badge-good inline-flex items-center gap-1">
            <IconCheck width={12} height={12} strokeWidth={2.6} /> {a.status === "closed" ? "Closed" : "Approved"}
          </span>
        )}
        <span className="flex items-center gap-1 text-xs font-semibold text-foreground/45 transition-colors group-hover:text-foreground">
          {a.status === "open" ? (
            <>
              <span className="hidden sm:inline">Open</span>
              <IconArrowRight width={15} height={15} />
            </>
          ) : (
            shortDate(a.closedAt ?? a.verifiedAt ?? a.completedAt ?? a.dueDate)
          )}
        </span>
      </div>
    </Link>
  );
}
