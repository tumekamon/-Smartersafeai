import Link from "next/link";
import { WorkTabs } from "@/components/work-tabs";
import { getCurrentUser } from "@/lib/dal";
import { siteIdsFor, sitesFor } from "@/lib/scope";
import { getCapabilities } from "@/lib/authz";
import { getProject, getUser, listCorrectiveActions } from "@/lib/db";
import { isActionOverdue } from "@/lib/metrics";
import { shortDate } from "@/lib/format";
import { updateCorrectiveActionStatusAction } from "@/lib/actions/corrective-actions";
import type { CorrectiveAction, CorrectiveActionStatus, RiskLevel } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { IconArrowRight, IconMapPin } from "@/components/ui/icons";
import { nowMs } from "@/lib/time";

const DAY = 86_400_000;

const COLUMNS: { status: CorrectiveActionStatus; title: string; short: string; color: string }[] = [
  { status: "open", title: "Open", short: "Open", color: "var(--status-warning)" },
  { status: "completed", title: "Awaiting verification", short: "To verify", color: "var(--chart-series-1)" },
  { status: "verified", title: "Verified", short: "Verified", color: "var(--status-good)" },
  { status: "closed", title: "Closed (14d)", short: "Closed", color: "var(--status-neutral)" },
];

const NEXT: Record<CorrectiveActionStatus, { next: CorrectiveActionStatus; label: string } | null> = {
  open: { next: "completed", label: "Mark done" },
  completed: { next: "verified", label: "Verify fix" },
  verified: { next: "closed", label: "Close out" },
  closed: null,
};

const stripe: Record<RiskLevel, string> = {
  critical: "var(--status-critical)",
  high: "var(--status-serious)",
  medium: "var(--status-warning)",
  low: "var(--status-good)",
};

function Pill({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors ${
        active ? "bg-foreground text-background" : "bg-surface text-foreground/65 ring-1 ring-border hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function CorrectiveActionsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; project?: string; col?: string }>;
}) {
  const user = await getCurrentUser();
  const caps = getCapabilities(user);
  const isWorker = user.role === "WORKER";
  const sp = await searchParams;
  const view = isWorker ? "mine" : (sp.view ?? "all");

  const now = nowMs();
  const sites = siteIdsFor(user);
  const all = listCorrectiveActions(user.companyId).filter(
    (a) =>
      sites.has(a.projectId) &&
      (!sp.project || a.projectId === sp.project) &&
      (view !== "mine" || a.assignedToId === user.id) &&
      (view !== "overdue" || isActionOverdue(a, now)) &&
      (a.status !== "closed" || now - new Date(a.closedAt ?? a.createdAt).getTime() < 14 * DAY)
  );

  const overdue = all.filter((a) => isActionOverdue(a, now)).length;
  const counts = Object.fromEntries(COLUMNS.map((c) => [c.status, all.filter((a) => a.status === c.status).length])) as Record<CorrectiveActionStatus, number>;
  const activeCol = COLUMNS.some((c) => c.status === sp.col) ? (sp.col as CorrectiveActionStatus) : "open";
  const q = (over: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { view: sp.view, project: sp.project, col: sp.col, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/corrective-actions?${s}` : "/corrective-actions";
  };

  const canAdvance = (a: CorrectiveAction) => {
    const n = NEXT[a.status];
    if (!n) return null;
    const mine = a.assignedToId === user.id;
    const ok =
      (n.next === "completed" && caps.canCompleteOwnActions && (mine || caps.canVerifyActions)) ||
      (n.next === "verified" && caps.canVerifyActions) ||
      (n.next === "closed" && caps.canCloseActions);
    return ok && !caps.isReadOnly ? n : null;
  };

  return (
    <div className="space-y-6">
      <WorkTabs user={user} caps={caps} active="fixes" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{isWorker ? "My tasks" : "Fixes"}</h1>
          <p className="mt-1 text-sm text-foreground/60">
            {all.filter((a) => a.status !== "closed").length} in progress
            {overdue > 0 && <span className="font-semibold text-critical"> · {overdue} overdue</span>}
          </p>
        </div>
        {!isWorker && (
          <div className="flex flex-wrap items-center gap-4">
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
              <Pill href={q({ view: undefined })} active={view === "all"}>Everything</Pill>
              <Pill href={q({ view: "overdue" })} active={view === "overdue"}>Overdue</Pill>
              <Pill href={q({ view: "mine" })} active={view === "mine"}>Mine</Pill>
              <span className="mx-1 self-center text-foreground/20">|</span>
              <Pill href={q({ project: undefined })} active={!sp.project}>All sites</Pill>
              {sitesFor(user).map((p) => (
                <Pill key={p.id} href={q({ project: p.id })} active={sp.project === p.id}>{p.shortName}</Pill>
              ))}
            </div>
            <Link href="/corrective-actions/new" className="flex min-h-11 items-center rounded-xl bg-sidebar-accent px-5 text-[15px] font-bold text-white">
              + Assign a fix
            </Link>
          </div>
        )}
      </div>

      {/* Phones show one column at a time, picked from these tiles, instead of four stacked lists. */}
      <nav aria-label="Status" className="grid grid-cols-4 gap-1.5 md:hidden">
        {COLUMNS.map((col) => {
          const on = col.status === activeCol;
          return (
            <Link
              key={col.status}
              href={q({ col: col.status })}
              aria-current={on ? "page" : undefined}
              className={`flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-center ${on ? "bg-foreground text-background" : "card"}`}
            >
              <span className="text-xl font-extrabold leading-none">{counts[col.status]}</span>
              <span className="text-[11px] font-bold leading-tight">{col.short}</span>
            </Link>
          );
        })}
      </nav>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = all
            .filter((a) => a.status === col.status)
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
          return (
            <section key={col.status} className={`rounded-2xl bg-surface-muted/60 p-3 ${col.status === activeCol ? "" : "hidden md:block"}`}>
              <div className="mb-3 flex items-center justify-between px-1.5">
                <h2 className="flex items-center gap-2 text-[15px] font-bold">
                  <span className="h-3 w-3 rounded-full" style={{ background: col.color }} />
                  {col.title}
                </h2>
                <span className="rounded-full bg-surface px-2.5 py-0.5 text-sm font-bold ring-1 ring-border">{items.length}</span>
              </div>
              <div className="space-y-2.5">
                {items.slice(0, 12).map((a) => {
                  const owner = getUser(a.assignedToId);
                  const project = getProject(a.projectId);
                  const late = isActionOverdue(a, now);
                  const days = Math.ceil((new Date(a.dueDate).getTime() + DAY - now) / DAY);
                  const step = canAdvance(a);
                  return (
                    <article key={a.id} className="card relative overflow-hidden p-4 pl-5">
                      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: stripe[a.priority] }} />
                      <p className="text-[15px] font-semibold leading-snug">{a.description.split(" — ")[0]}</p>
                      <p className="mt-1.5 flex items-center gap-1 text-xs text-foreground/55">
                        <IconMapPin width={13} height={13} />
                        {project?.shortName}{a.location ? ` · ${a.location.level} ${a.location.zone}` : ""}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground/70">
                          {owner && <Avatar person={owner} size={24} />}
                          {owner?.firstName}
                        </span>
                        {a.status === "completed" ? (
                          <span className="text-[11px] text-foreground/50">
                            Fixed {a.completedAt ? Math.max(0, Math.floor((now - new Date(a.completedAt).getTime()) / DAY)) : 0}d ago
                          </span>
                        ) : a.status === "closed" || a.status === "verified" ? (
                          <span className="text-[11px] text-foreground/45">{shortDate(a.closedAt ?? a.verifiedAt ?? a.dueDate)}</span>
                        ) : (
                          <span className={`badge ${late ? "badge-critical" : days <= 2 ? "badge-warning" : "badge-neutral"}`}>
                            {late ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `Due in ${days}d`}
                          </span>
                        )}
                      </div>
                      {step && (
                        <form action={updateCorrectiveActionStatusAction} className="mt-3">
                          <input type="hidden" name="correctiveActionId" value={a.id} />
                          <input type="hidden" name="status" value={step.next} />
                          <button
                            type="submit"
                            className={`flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-bold transition-colors ${
                              step.next === "closed" ? "bg-surface-muted hover:bg-sidebar-accent hover:text-white" : "bg-foreground text-background hover:opacity-90"
                            }`}
                          >
                            {step.label}
                            <IconArrowRight width={16} height={16} />
                          </button>
                        </form>
                      )}
                    </article>
                  );
                })}
                {items.length === 0 && <p className="px-2 py-6 text-center text-xs text-foreground/40">Nothing here</p>}
                {items.length > 12 && <p className="px-2 py-1 text-center text-xs text-foreground/45">+ {items.length - 12} more</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
