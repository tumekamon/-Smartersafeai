import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { getProject, getUser, listCorrectiveActions, listProjects } from "@/lib/db";
import { isActionOverdue } from "@/lib/metrics";
import { shortDate } from "@/lib/format";
import { updateCorrectiveActionStatusAction } from "@/lib/actions/corrective-actions";
import type { CorrectiveAction, CorrectiveActionStatus, RiskLevel } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { IconArrowRight, IconMapPin } from "@/components/ui/icons";
import { nowMs } from "@/lib/time";

const DAY = 86_400_000;

const COLUMNS: { status: CorrectiveActionStatus; title: string; color: string }[] = [
  { status: "open", title: "Open", color: "var(--status-warning)" },
  { status: "completed", title: "Awaiting verification", color: "var(--chart-series-1)" },
  { status: "verified", title: "Verified", color: "var(--status-good)" },
  { status: "closed", title: "Closed (14d)", color: "var(--status-neutral)" },
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
      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
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
  searchParams: Promise<{ view?: string; project?: string }>;
}) {
  const user = await getCurrentUser();
  const caps = getCapabilities(user.role);
  const isWorker = user.role === "WORKER";
  const sp = await searchParams;
  const view = isWorker ? "mine" : (sp.view ?? "all");

  const now = nowMs();
  const all = listCorrectiveActions(user.companyId).filter(
    (a) =>
      (!sp.project || a.projectId === sp.project) &&
      (view !== "mine" || a.assignedToId === user.id) &&
      (view !== "overdue" || isActionOverdue(a, now)) &&
      (a.status !== "closed" || now - new Date(a.closedAt ?? a.createdAt).getTime() < 14 * DAY)
  );

  const overdue = all.filter((a) => isActionOverdue(a, now)).length;
  const q = (over: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { view: sp.view, project: sp.project, ...over };
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{isWorker ? "My tasks" : "Corrective actions"}</h1>
          <p className="mt-1 text-sm text-foreground/60">
            {all.filter((a) => a.status !== "closed").length} in progress
            {overdue > 0 && <span className="font-semibold text-critical"> · {overdue} overdue</span>}
          </p>
        </div>
        {!isWorker && (
          <div className="flex flex-wrap gap-2">
            <Pill href={q({ view: undefined })} active={view === "all"}>Everything</Pill>
            <Pill href={q({ view: "overdue" })} active={view === "overdue"}>Overdue</Pill>
            <Pill href={q({ view: "mine" })} active={view === "mine"}>Mine</Pill>
            <span className="mx-1 self-center text-foreground/20">|</span>
            <Pill href={q({ project: undefined })} active={!sp.project}>All sites</Pill>
            {listProjects(user.companyId).map((p) => (
              <Pill key={p.id} href={q({ project: p.id })} active={sp.project === p.id}>{p.shortName}</Pill>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = all
            .filter((a) => a.status === col.status)
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
          return (
            <section key={col.status} className="rounded-2xl bg-surface-muted/60 p-3">
              <div className="mb-3 flex items-center justify-between px-1.5">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <span className="h-2 w-2 rounded-full" style={{ background: col.color }} />
                  {col.title}
                </h2>
                <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold ring-1 ring-border">{items.length}</span>
              </div>
              <div className="space-y-2.5">
                {items.slice(0, 12).map((a) => {
                  const owner = getUser(a.assignedToId);
                  const project = getProject(a.projectId);
                  const late = isActionOverdue(a, now);
                  const days = Math.ceil((new Date(a.dueDate).getTime() + DAY - now) / DAY);
                  const step = canAdvance(a);
                  return (
                    <article key={a.id} className="card relative overflow-hidden p-3.5 pl-4">
                      <span className="absolute inset-y-0 left-0 w-1" style={{ background: stripe[a.priority] }} />
                      <p className="text-sm font-medium leading-snug">{a.description.split(" — ")[0]}</p>
                      <p className="mt-1.5 flex items-center gap-1 text-[11px] text-foreground/50">
                        <IconMapPin width={11} height={11} />
                        {project?.shortName}{a.location ? ` · ${a.location.level} ${a.location.zone}` : ""}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-xs text-foreground/65">
                          {owner && <Avatar person={owner} size={20} />}
                          {owner?.firstName}
                        </span>
                        {a.status === "completed" ? (
                          <span className="text-[11px] text-foreground/50">
                            Fixed {a.completedAt ? Math.max(0, Math.floor((now - new Date(a.completedAt).getTime()) / DAY)) : 0}d ago
                          </span>
                        ) : a.status === "closed" || a.status === "verified" ? (
                          <span className="text-[11px] text-foreground/45">{shortDate(a.closedAt ?? a.verifiedAt ?? a.dueDate)}</span>
                        ) : (
                          <span className={`text-[11px] font-semibold ${late ? "text-critical" : days <= 2 ? "tone-warning" : "text-foreground/50"}`}>
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
                            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-surface-muted py-1.5 text-xs font-semibold transition-colors hover:bg-sidebar-accent hover:text-white"
                          >
                            {step.label}
                            <IconArrowRight width={12} height={12} />
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
