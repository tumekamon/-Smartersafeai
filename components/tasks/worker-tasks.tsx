import Link from "next/link";
import type { CorrectiveAction, Project } from "@/lib/types";
import { daysLeft } from "@/lib/tasks";
import { siteContacts } from "@/lib/site";
import { TaskCard } from "@/components/tasks/task-card";
import { Avatar } from "@/components/ui/avatar";
import { IconCamera, IconCheck, IconClipboardCheck, IconPhone, IconWrench } from "@/components/ui/icons";

const DAY = 86_400_000;
type Tab = "todo" | "check" | "done";

const STEPS = [
  { Icon: IconClipboardCheck, title: "You get a task", text: "From a hazard, a failed equipment check, or your supervisor." },
  { Icon: IconWrench, title: "Fix it by the due date", text: "Critical within a day; low within two weeks." },
  { Icon: IconCamera, title: "Mark it fixed", text: "A photo of the fixed spot, or a note for jobs like briefings." },
  { Icon: IconCheck, title: "Your supervisor checks it", text: "Approved, or sent back with what's still missing." },
];

/**
 * A worker's own tasks on their working site: what to do now, what's being checked,
 * and what's finished. Overdue and sent-back work always comes first.
 */
export function WorkerTasks({ tasks, site, tab, now }: { tasks: CorrectiveAction[]; site?: Project; tab: Tab; now: number }) {
  const todo = tasks.filter((a) => a.status === "open");
  const check = tasks.filter((a) => a.status === "completed");
  const done = tasks
    .filter((a) => (a.status === "verified" || a.status === "closed") && now - Date.parse(a.closedAt ?? a.verifiedAt ?? a.createdAt) < 30 * DAY)
    .sort((a, b) => (b.closedAt ?? b.verifiedAt ?? "").localeCompare(a.closedAt ?? a.verifiedAt ?? ""));
  const byDue = (a: CorrectiveAction, b: CorrectiveAction) => a.dueDate.localeCompare(b.dueDate);

  const groups = [
    { title: "Sent back to you", items: todo.filter((a) => a.sentBack), tone: "var(--status-critical)" },
    { title: "Overdue", items: todo.filter((a) => !a.sentBack && daysLeft(a, now) < 0), tone: "var(--status-critical)" },
    { title: "Due today", items: todo.filter((a) => !a.sentBack && daysLeft(a, now) === 0), tone: "var(--status-serious)" },
    { title: "This week", items: todo.filter((a) => !a.sentBack && daysLeft(a, now) > 0 && daysLeft(a, now) <= 7), tone: "var(--status-warning)" },
    { title: "Later", items: todo.filter((a) => !a.sentBack && daysLeft(a, now) > 7), tone: "var(--border)" },
  ].filter((g) => g.items.length > 0);

  const overdue = todo.filter((a) => daysLeft(a, now) < 0).length;
  const week = todo.filter((a) => daysLeft(a, now) >= 0 && daysLeft(a, now) <= 7).length;
  const tabs: { id: Tab; label: string; n: number }[] = [
    { id: "todo", label: "To do", n: todo.length },
    { id: "check", label: "Being checked", n: check.length },
    { id: "done", label: "Done", n: done.length },
  ];
  const contacts = site ? siteContacts(site) : [];

  const empty = {
    todo: { title: "Nothing to fix right now", text: "New tasks from your supervisor will show up here." },
    check: { title: "Nothing waiting for a check", text: "When you mark a task fixed, it waits here until it's approved." },
    done: { title: "No finished tasks yet", text: "Approved fixes from the last 30 days show here." },
  }[tab];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">{site ? site.shortName : "No site"}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">My tasks</h1>
        </div>
        <dl className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:min-w-[26rem]">
          {[
            { k: "Overdue", v: overdue, color: overdue ? "var(--status-critical)" : undefined },
            { k: "Due in 7 days", v: week, color: week ? "var(--status-warning)" : undefined },
            { k: "Being checked", v: check.length, color: check.length ? "var(--sidebar-accent)" : undefined },
          ].map((s) => (
            <div key={s.k} className="card px-3.5 py-2.5">
              <dd className="text-2xl font-black tabular-nums leading-tight" style={s.color ? { color: s.color } : undefined}>{s.v}</dd>
              <dt className="text-[11px] font-semibold text-foreground/55">{s.k}</dt>
            </div>
          ))}
        </dl>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-5">
          <nav aria-label="Task status" className="flex gap-1 rounded-2xl bg-surface-muted p-1">
            {tabs.map((t) => {
              const on = t.id === tab;
              return (
                <Link
                  key={t.id}
                  href={t.id === "todo" ? "/corrective-actions" : `/corrective-actions?tab=${t.id}`}
                  aria-current={on ? "page" : undefined}
                  className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-2 text-sm font-bold transition-colors ${
                    on ? "bg-surface shadow-sm ring-1 ring-border" : "text-foreground/55 hover:text-foreground"
                  }`}
                >
                  <span className="truncate">{t.label}</span>
                  <span className={`rounded-full px-1.5 text-xs tabular-nums ${on ? "bg-foreground text-background" : "bg-foreground/10"}`}>{t.n}</span>
                </Link>
              );
            })}
          </nav>

          {(tab === "todo" ? todo : tab === "check" ? check : done).length === 0 ? (
            <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-status-good/15 text-status-good">
                <IconCheck width={24} height={24} strokeWidth={2.6} />
              </span>
              <p className="mt-1 font-bold">{empty.title}</p>
              <p className="max-w-xs text-sm text-foreground/55">{empty.text}</p>
            </div>
          ) : tab === "todo" ? (
            groups.map((g) => (
              <section key={g.title} aria-label={g.title}>
                <h2 className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground/60">
                  <span className="h-2 w-2 rounded-full" style={{ background: g.tone }} />
                  {g.title}
                  <span className="text-foreground/35">{g.items.length}</span>
                </h2>
                <div className="space-y-2.5">
                  {[...g.items].sort(byDue).map((a) => (
                    <TaskCard key={a.id} task={a} now={now} />
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div className="space-y-2.5">
              {(tab === "check" ? [...check].sort(byDue) : done).map((a) => (
                <TaskCard key={a.id} task={a} now={now} />
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          {contacts.length > 0 && (
            <section className="card p-4">
              <h2 className="text-sm font-bold">Stuck on a task?</h2>
              <p className="mt-0.5 text-xs text-foreground/55">Call your supervisor before the due date, not after.</p>
              <ul className="mt-3 space-y-2">
                {contacts.slice(0, 2).map(({ user: c, role }) => (
                  <li key={c.id} className="flex items-center gap-3">
                    <Avatar person={c} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{c.firstName} {c.lastName}</span>
                      <span className="block truncate text-xs text-foreground/50">{role}</span>
                    </span>
                    {c.phone && (
                      <a
                        href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}
                        aria-label={`Call ${c.firstName}`}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-status-good text-white"
                      >
                        <IconPhone width={17} height={17} />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card hidden p-4 lg:block">
            <h2 className="text-sm font-bold">How a task works</h2>
            <ol className="mt-3 space-y-3.5">
              {STEPS.map(({ Icon, title, text }, i) => (
                <li key={title} className="flex gap-3">
                  <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-foreground/70">
                    <Icon width={16} height={16} />
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-[9px] font-black text-background">{i + 1}</span>
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{title}</span>
                    <span className="block text-xs text-foreground/55">{text}</span>
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
