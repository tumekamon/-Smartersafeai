import Link from "next/link";
import type { CorrectiveAction, Project } from "@/lib/types";
import { getUser } from "@/lib/db";
import { daysLeft, taskTitle } from "@/lib/tasks";
import { TaskRow } from "@/components/tasks/task-row";

const DAY = 86_400_000;
type Tab = "todo" | "check" | "done";

/**
 * A worker's own tasks on their working site (design canvas W06): status chips, the
 * list on a blue rule, and anything sent back as a note to read underneath.
 */
export function WorkerTasks({ tasks, site, tab, now }: { tasks: CorrectiveAction[]; site?: Project; tab: Tab; now: number }) {
  const byDue = (a: CorrectiveAction, b: CorrectiveAction) => a.dueDate.localeCompare(b.dueDate);
  const todo = tasks.filter((a) => a.status === "open");
  const sentBack = todo.filter((a) => a.sentBack).sort(byDue);
  // Overdue first, then by due date.
  const todoRows = todo
    .filter((a) => !a.sentBack)
    .sort((a, b) => Number(daysLeft(b, now) < 0) - Number(daysLeft(a, now) < 0) || byDue(a, b));
  const check = tasks.filter((a) => a.status === "completed").sort(byDue);
  const done = tasks
    .filter((a) => (a.status === "verified" || a.status === "closed") && now - Date.parse(a.closedAt ?? a.verifiedAt ?? a.createdAt) < 30 * DAY)
    .sort((a, b) => (b.closedAt ?? b.verifiedAt ?? "").localeCompare(a.closedAt ?? a.verifiedAt ?? ""));

  const tabs: { id: Tab; label: string; n: number }[] = [
    { id: "todo", label: "To do", n: todo.length },
    { id: "check", label: "Being checked", n: check.length },
    { id: "done", label: "Done", n: done.length },
  ];
  const rows = tab === "todo" ? todoRows : tab === "check" ? check : done;
  const empty = {
    todo: sentBack.length ? null : "Nothing to fix right now. New tasks from your supervisor show up here.",
    check: "Nothing waiting. When you mark a task fixed, it waits here until it's approved.",
    done: "Approved fixes from the last 30 days show here.",
  }[tab];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 pt-3 lg:pt-0">
      <header className="flex flex-col gap-3">
        <span className="eyebrow">Assigned to you{site ? ` · ${site.shortName}` : ""}</span>
        <h1 className="disp text-[40px] leading-none">My tasks</h1>
      </header>

      <nav aria-label="Task status" className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={t.id === "todo" ? "/corrective-actions" : `/corrective-actions?tab=${t.id}`}
            aria-current={t.id === tab ? "page" : undefined}
            className="ds-chip"
          >
            {t.label}
            {t.n > 0 && <span className="tabular-nums">{t.n}</span>}
          </Link>
        ))}
      </nav>

      {rows.length > 0 ? (
        <div className="flex flex-col border-t-2 border-brand">
          {rows.map((a) => (
            <TaskRow key={a.id} task={a} now={now} />
          ))}
        </div>
      ) : (
        empty && <p className="border-t-2 border-brand py-5 text-[15px] text-body">{empty}</p>
      )}

      {tab === "todo" &&
        sentBack.map((a) => {
          const by = getUser(a.sentBack!.byId);
          return (
            <div key={a.id} className="ds-note">
              <span className="eyebrow" style={{ color: "var(--brand)" }}>
                Sent back to you
              </span>
              <span className="text-[15px] leading-relaxed">
                &ldquo;{a.sentBack!.note}&rdquo; {by ? `${by.firstName} ${by.lastName}` : "Your supervisor"}, on {taskTitle(a)}
              </span>
              <Link href={`/corrective-actions/${a.id}`} className="self-start text-[15px] font-semibold text-brand hover:underline">
                Open task
              </Link>
            </div>
          );
        })}
    </div>
  );
}
