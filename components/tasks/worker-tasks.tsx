import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import type { CorrectiveAction, Project } from "@/lib/types";
import { daysLeft } from "@/lib/tasks";
import { siteContacts } from "@/lib/site";
import { TaskListRow, TaskTableHead } from "@/components/tasks/task-list";
import { Avatar } from "@/components/ui/avatar";
import { IconAlertTriangle, IconCalendar, IconCamera, IconCheck, IconClipboardCheck, IconClock, IconPhone, IconWrench } from "@/components/ui/icons";

const DAY = 86_400_000;
type Tab = "todo" | "check" | "done";

const STEPS = [
  { Icon: IconClipboardCheck, title: "You get a task", text: "From a hazard, a failed check, or your supervisor." },
  { Icon: IconWrench, title: "Fix it by the due date", text: "Critical within a day, low within two weeks." },
  { Icon: IconCamera, title: "Mark it fixed", text: "A photo of the fixed spot, or a note for jobs like briefings." },
  { Icon: IconCheck, title: "Your supervisor checks it", text: "Approved, or sent back with what's still missing." },
];

/**
 * A worker's own tasks on their working site, laid out like a CRM work list: summary
 * cards, status tabs, then the list grouped by urgency (sent back, overdue, due today,
 * this week, later). A table on large screens, two-line rows on phones. Who to call and
 * how a task works sit beside it on wide screens and below it on small ones.
 */
export function WorkerTasks({ tasks, site, tab, now }: { tasks: CorrectiveAction[]; site?: Project; tab: Tab; now: number }) {
  const byDue = (a: CorrectiveAction, b: CorrectiveAction) => (a.dueAt ?? a.dueDate).localeCompare(b.dueAt ?? b.dueDate);
  const todo = tasks.filter((a) => a.status === "open");
  const check = tasks.filter((a) => a.status === "completed").sort(byDue);
  const done = tasks
    .filter((a) => (a.status === "verified" || a.status === "closed") && now - Date.parse(a.closedAt ?? a.verifiedAt ?? a.createdAt) < 30 * DAY)
    .sort((a, b) => (b.closedAt ?? b.verifiedAt ?? "").localeCompare(a.closedAt ?? a.verifiedAt ?? ""));

  const d = (a: CorrectiveAction) => daysLeft(a, now);
  const groups = [
    { title: "Sent back to you", tone: "var(--status-critical)", items: todo.filter((a) => a.sentBack) },
    { title: "Overdue", tone: "var(--status-critical)", items: todo.filter((a) => !a.sentBack && d(a) < 0) },
    { title: "Due today", tone: "var(--status-serious)", items: todo.filter((a) => !a.sentBack && d(a) === 0) },
    { title: "This week", tone: "var(--status-warning)", items: todo.filter((a) => !a.sentBack && d(a) > 0 && d(a) <= 7) },
    { title: "Later", tone: "var(--brand)", items: todo.filter((a) => !a.sentBack && d(a) > 7) },
  ]
    .map((g) => ({ ...g, items: g.items.sort(byDue) }))
    .filter((g) => g.items.length > 0);

  const overdue = todo.filter((a) => d(a) < 0).length;
  const thisWeek = todo.filter((a) => d(a) >= 0 && d(a) <= 7).length;
  const tabs: { id: Tab; label: string; n: number }[] = [
    { id: "todo", label: "To do", n: todo.length },
    { id: "check", label: "Being checked", n: check.length },
    { id: "done", label: "Done", n: done.length },
  ];
  const rows = tab === "check" ? check : done;
  const empty = {
    todo: { title: "Nothing to fix right now", text: "New tasks from your supervisor show up here." },
    check: { title: "Nothing waiting for a check", text: "When you mark a task fixed, it waits here until it's approved." },
    done: { title: "No finished tasks yet", text: "Approved fixes from the last 30 days show here." },
  }[tab];
  const isEmpty = tab === "todo" ? todo.length === 0 : rows.length === 0;
  const contacts = site ? siteContacts(site).slice(0, 2) : [];

  return (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-5 sm:gap-6">
      <header className="flex flex-col gap-1.5">
        <span className="eyebrow">Assigned to you{site ? ` · ${site.shortName}` : ""}</span>
        <h1 className="disp text-[32px] leading-tight sm:text-[36px]">My tasks</h1>
        <p className="text-[15px] text-body">
          {todo.length === 0
            ? "You're all caught up."
            : `${todo.length} to do${overdue ? `, ${overdue} overdue` : ""}. Fix the red ones first.`}
        </p>
      </header>

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <Summary label="To do" value={todo.length} Icon={IconClipboardCheck} href="/corrective-actions" />
        <Summary label="Overdue" value={overdue} Icon={IconAlertTriangle} href="/corrective-actions" tone={overdue ? "var(--status-critical)" : undefined} />
        <Summary label="Due this week" value={thisWeek} Icon={IconCalendar} href="/corrective-actions" tone={thisWeek ? "var(--status-warning)" : undefined} />
        <Summary label="Being checked" value={check.length} Icon={IconClock} href="/corrective-actions?tab=check" />
      </section>

      <div className="grid grid-cols-1 gap-5 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_19rem] xl:items-start">
        <section className="wk-card min-w-0 overflow-hidden">
          <nav aria-label="Task status" className="flex gap-1 overflow-x-auto border-b border-border px-2 sm:px-3">
            {tabs.map((t) => {
              const on = t.id === tab;
              return (
                <Link
                  key={t.id}
                  href={t.id === "todo" ? "/corrective-actions" : `/corrective-actions?tab=${t.id}`}
                  aria-current={on ? "page" : undefined}
                  className={`relative flex min-h-12 shrink-0 items-center gap-2 px-3 text-sm font-semibold transition-colors ${
                    on ? "text-foreground" : "text-body hover:text-foreground"
                  }`}
                >
                  {t.label}
                  <span className={`rounded-full px-2 text-xs leading-5 tabular-nums ${on ? "bg-brand text-surface" : "bg-surface-muted text-body"}`}>{t.n}</span>
                  {on && <span aria-hidden="true" className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand" />}
                </Link>
              );
            })}
          </nav>

          {isEmpty ? (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <span className="wk-icon" style={{ color: "var(--status-good)", background: "color-mix(in srgb, var(--status-good) 13%, var(--surface))" }}>
                <IconCheck width={20} height={20} strokeWidth={2.4} />
              </span>
              <p className="mt-1 font-semibold">{empty.title}</p>
              <p className="max-w-xs text-sm text-body">{empty.text}</p>
            </div>
          ) : (
            <>
              <TaskTableHead />
              {tab === "todo" ? (
                groups.map((g) => (
                  <section key={g.title} aria-label={g.title}>
                    <h2 className="flex items-center gap-2 border-b border-border bg-surface-muted/40 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-body">
                      <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: g.tone }} />
                      {g.title}
                      <span className="text-muted">{g.items.length}</span>
                    </h2>
                    <ul className="divide-y divide-border">
                      {g.items.map((a) => (
                        <li key={a.id}>
                          <TaskListRow task={a} now={now} />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))
              ) : (
                <ul className="divide-y divide-border">
                  {rows.map((a) => (
                    <li key={a.id}>
                      <TaskListRow task={a} now={now} />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>

        <aside className="grid gap-5 sm:grid-cols-2 sm:gap-6 xl:grid-cols-1">
          {contacts.length > 0 && (
            <section className="wk-card p-4 sm:p-5">
              <h2 className="text-base font-semibold">Stuck on a task?</h2>
              <p className="text-[13px] text-body">Call before the due date, not after.</p>
              <ul className="mt-3 flex flex-col">
                {contacts.map(({ user: c, role }) => (
                  <li key={c.id} className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0">
                    <Avatar person={c} size={34} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[15px] font-medium">
                        {c.firstName} {c.lastName}
                      </span>
                      <span className="truncate text-[13px] text-body">{role}</span>
                    </span>
                    {c.phone && (
                      <a
                        href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}
                        aria-label={`Call ${c.firstName}`}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border tone-good hover:bg-surface-muted"
                      >
                        <IconPhone width={16} height={16} strokeWidth={2} />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="wk-card p-4 sm:p-5">
            <h2 className="text-base font-semibold">How a task works</h2>
            <ol className="mt-3 flex flex-col gap-3.5">
              {STEPS.map(({ Icon, title, text }, i) => (
                <li key={title} className="flex gap-3">
                  <span className="wk-icon relative h-9 w-9 rounded-lg">
                    <Icon width={16} height={16} />
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-ink text-[9px] font-bold text-white">{i + 1}</span>
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold">{title}</span>
                    <span className="text-[13px] text-body">{text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Summary({
  label,
  value,
  Icon,
  href,
  tone,
}: {
  label: string;
  value: number;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  href: string;
  tone?: string;
}) {
  return (
    <Link href={href} className="wk-card flex min-w-0 items-center gap-3 p-3.5 transition-colors hover:border-brand/40 sm:p-4">
      <span className="wk-icon" style={tone ? { color: tone, background: `color-mix(in srgb, ${tone} 13%, var(--surface))` } : undefined}>
        <Icon width={18} height={18} strokeWidth={2} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="disp text-[26px] leading-none tabular-nums" style={tone && value ? { color: tone } : undefined}>
          {value}
        </span>
        <span className="truncate text-[13px] text-body">{label}</span>
      </span>
    </Link>
  );
}
