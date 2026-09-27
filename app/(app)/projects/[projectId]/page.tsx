import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import {
  getTemplate,
  getUser,
  getProject,
  listCertifications,
  listCorrectiveActionsForProject,
  listGcNotices,
  listInspectionsForProject,
  listTemplates,
  listFindings,
  listUsers,
} from "@/lib/db";
import { addCrewMemberAction, removeCrewMemberAction } from "@/lib/actions/projects";
import {
  activityFeed,
  certStatus,
  hazardBreakdown,
  heatmap,
  hotspots,
  insights,
  isActionOverdue,
  passRate,
  projectHealth,
  weeklySeries,
} from "@/lib/metrics";
import { shortDate, timeAgo } from "@/lib/format";
import { ScoreRing } from "@/components/viz/score-ring";
import { TrendChart } from "@/components/viz/trend-chart";
import { HeatMap } from "@/components/viz/heat-map";
import { BreakdownBars } from "@/components/ui/breakdown-bars";
import { Avatar } from "@/components/ui/avatar";
import { CorrectiveActionStatusBadge, InspectionStatusBadge, RiskBadge } from "@/components/ui/badges";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { InsightCard } from "@/components/dashboard/insight-card";
import { IconArrowRight, IconBolt, IconMapPin, IconTrash } from "@/components/ui/icons";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "inspections", label: "Inspections" },
  { id: "actions", label: "Actions" },
  { id: "coordination", label: "Coordination" },
  { id: "crew", label: "Crew" },
] as const;

const levelLabel = { low: "Strong", medium: "Watch", high: "At risk", critical: "Critical" } as const;
const noticeTone = { open: "badge-warning", acknowledged: "badge-info", resolved: "badge-good" } as const;

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { projectId } = await params;
  const { tab = "overview" } = await searchParams;
  const user = await getCurrentUser();
  const project = getProject(projectId);
  if (!project || project.companyId !== user.companyId) notFound();

  const caps = getCapabilities(user.role);
  const h = projectHealth(project);
  const templates = listTemplates(user.companyId);
  const inspections = listInspectionsForProject(projectId);
  const actions = listCorrectiveActionsForProject(projectId);
  const notices = listGcNotices(user.companyId).filter((n) => n.projectId === projectId);

  return (
    <div className="space-y-6">
      <section className="hero p-6 md:p-7">
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <div className="flex items-center gap-4">
              <Link href="/projects" className="hero-muted text-xs font-medium hover:opacity-80">← All projects</Link>
              {caps.canManageSettings && (
                <Link href={`/projects/${projectId}/edit`} className="hero-muted text-xs font-medium hover:opacity-80">
                  Edit project
                </Link>
              )}
            </div>
            <p className="hero-muted mt-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider">
              <IconMapPin width={12} height={12} />
              {project.location} · {project.projectNumber} · {project.client}
            </p>
            <h1 className="mt-1.5 text-3xl font-semibold leading-tight tracking-tight">{project.name}</h1>
            <div className="mt-4 max-w-sm">
              <div className="hero-muted mb-1 flex justify-between text-[11px]">
                <span>Construction progress</span>
                <span className="font-semibold" style={{ color: "var(--hero-fg)" }}>{project.percentComplete}%</span>
              </div>
              <div className="hero-track h-1.5 rounded-full">
                <div className="hero-track-fill h-1.5 rounded-full" style={{ width: `${project.percentComplete}%` }} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { v: h.openActions, l: "open" },
                { v: h.overdue, l: "overdue" },
                { v: h.pendingReviews, l: "to review" },
              ].map((s) => (
                <div key={s.l}>
                  <p className="text-3xl font-semibold leading-none">{s.v}</p>
                  <p className="hero-muted mt-1 text-[11px] uppercase tracking-wider">{s.l}</p>
                </div>
              ))}
            </div>
            <div className="text-center">
              <ScoreRing score={h.score} level={h.level} size={112} stroke={10} onDark label={levelLabel[h.level]} />
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex gap-1 rounded-xl bg-surface p-1 ring-1 ring-border">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={`/projects/${projectId}?tab=${t.id}`}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                tab === t.id ? "bg-foreground text-background" : "text-foreground/60 hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        {caps.canSubmitInspections && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-medium text-foreground/50">
              <IconBolt width={14} height={14} />
              Start
            </span>
            {templates.map((t) => (
              <Link
                key={t.id}
                href={`/projects/${projectId}/inspections/new?templateId=${t.id}`}
                className="rounded-full bg-surface px-3 py-1.5 text-xs font-medium ring-1 ring-border transition-colors hover:bg-sidebar-accent hover:text-white hover:ring-sidebar-accent"
              >
                {t.name.replace(" Inspection", "").replace(" Pre-Use", "")}
              </Link>
            ))}
          </div>
        )}
      </div>

      {tab === "overview" && <Overview projectId={projectId} />}

      {tab === "inspections" && (
        <section className="card overflow-hidden">
          <ul className="divide-y divide-border">
            {inspections.slice(0, 40).map((i) => {
              const inspector = getUser(i.inspectorId);
              const rate = passRate(i);
              return (
                <li key={i.id}>
                  <Link href={`/inspections/${i.id}`} className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-muted">
                    {inspector && <Avatar person={inspector} size={32} />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{getTemplate(i.templateId)?.name}</p>
                      <p className="text-xs text-foreground/50">
                        {i.location.level} {i.location.zone} · {inspector?.firstName} {inspector?.lastName} · {timeAgo(new Date(i.submittedAt).getTime())}
                      </p>
                    </div>
                    <span className="hidden text-sm font-semibold md:block">{rate}%</span>
                    {i.findingIds.length > 0 && <span className="badge badge-serious">{i.findingIds.length}</span>}
                    <InspectionStatusBadge status={i.status} />
                    <IconArrowRight width={15} height={15} className="text-foreground/25" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {tab === "actions" && (
        <section className="card overflow-hidden">
          <ul className="divide-y divide-border">
            {actions.slice(0, 40).map((a) => {
              const owner = getUser(a.assignedToId);
              const late = isActionOverdue(a);
              return (
                <li key={a.id} className="flex items-center gap-4 px-5 py-3.5">
                  {owner && <Avatar person={owner} size={32} />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.description.split(" — ")[0]}</p>
                    <p className="text-xs text-foreground/50">
                      {owner?.firstName} {owner?.lastName}
                      {a.location ? ` · ${a.location.level} ${a.location.zone}` : ""} ·{" "}
                      <span className={late ? "font-semibold text-critical" : ""}>due {shortDate(a.dueDate)}</span>
                    </p>
                  </div>
                  <RiskBadge level={a.priority} />
                  <CorrectiveActionStatusBadge status={a.status} />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {tab === "coordination" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {notices.length === 0 && <p className="text-sm text-foreground/50">No coordination notices for this project.</p>}
          {notices.map((n) => (
            <section key={n.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">{n.trade}</p>
                  <h3 className="mt-1 text-sm font-semibold leading-snug">{n.issue}</h3>
                </div>
                <span className={`badge capitalize ${noticeTone[n.status]}`}>{n.status}</span>
              </div>
              <p className="mt-2 text-sm text-foreground/60">Impact: {n.impact}</p>
              {n.gcResponse && (
                <p className="mt-3 rounded-lg bg-surface-muted p-3 text-sm">
                  <span className="font-medium">GC response:</span> {n.gcResponse}
                </p>
              )}
              <p className="mt-3 flex items-center justify-between text-xs text-foreground/45">
                <span>Raised by {getUser(n.raisedById)?.firstName} {getUser(n.raisedById)?.lastName}</span>
                <span>{shortDate(n.raisedAt)} · {n.priority} priority</span>
              </p>
            </section>
          ))}
        </div>
      )}

      {tab === "crew" && <Crew crewIds={project.crewIds} />}
    </div>
  );

  function Overview({ projectId: pid }: { projectId: string }) {
    const series = weeklySeries(user.companyId, pid, 12);
    const heat = heatmap(user.companyId, pid);
    const spots = hotspots(user.companyId, pid, 3);
    const hazards = hazardBreakdown(user.companyId, pid).slice(0, 5);
    const feed = activityFeed(user.companyId, 8, pid);
    const ins = insights(user.companyId, pid);
    const pending = listFindings(user.companyId).filter((f) => f.projectId === pid && f.reviewerDecision === "pending").length;
    void pending;

    return (
      <div className="space-y-5">
        {ins.length > 0 && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {ins.slice(0, 2).map((i) => (
              <InsightCard key={i.id} insight={i} />
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          <section className="card p-5 lg:col-span-3">
            <h2 className="mb-3 text-sm font-semibold">Findings raised vs. actions closed</h2>
            <TrendChart points={series} />
          </section>
          <section className="card p-5 lg:col-span-2">
            <h2 className="mb-4 text-sm font-semibold">What is going wrong</h2>
            <BreakdownBars items={hazards.map((x) => ({ label: x.category, value: x.count, tone: "info" as const }))} />
          </section>
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
          <section className="card p-5 lg:col-span-3">
            <h2 className="mb-4 text-sm font-semibold">Where findings are happening</h2>
            <HeatMap levels={heat.levels} zones={heat.zones} cells={heat.cells} max={heat.max} />
            {spots.length > 0 && (
              <ol className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
                {spots.map((s, idx) => (
                  <li key={`${s.level}${s.zone}`} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-foreground/60">{idx + 1}</span>
                    <span className="flex-1"><span className="font-medium">{s.level} {s.zone}</span><span className="text-foreground/50"> · mostly {s.dominant.toLowerCase()}</span></span>
                    <span className="font-semibold">{s.count}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <section className="card p-5 lg:col-span-2">
            <h2 className="mb-4 text-sm font-semibold">Recent activity</h2>
            <ActivityFeed events={feed} />
          </section>
        </div>
      </div>
    );
  }

  function Crew({ crewIds }: { crewIds: string[] }) {
    const now = Date.now();
    const certs = listCertifications(user.companyId);
    const roster = listUsers(user.companyId);
    const available = roster.filter((u) => !crewIds.includes(u.id));
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {crewIds.map((id) => {
            const person = getUser(id);
            if (!person) return null;
            const mine = certs.filter((c) => c.userId === id);
            const expired = mine.filter((c) => certStatus(c.expiresOn, now) === "expired").length;
            const expiring = mine.filter((c) => certStatus(c.expiresOn, now) === "expiring").length;
            return (
              <section key={id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar person={person} size={42} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{person.firstName} {person.lastName}</p>
                      <p className="truncate text-xs text-foreground/50">{person.title}</p>
                    </div>
                  </div>
                  {caps.canManageSettings && (
                    <form action={removeCrewMemberAction}>
                      <input type="hidden" name="projectId" value={projectId} />
                      <input type="hidden" name="userId" value={id} />
                      <button
                        type="submit"
                        title="Remove from crew"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-foreground/40 transition-colors hover:bg-red-500/10 hover:text-critical"
                      >
                        <IconTrash width={13} height={13} />
                      </button>
                    </form>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {mine.map((c) => {
                    const s = certStatus(c.expiresOn, now);
                    return (
                      <span
                        key={c.id}
                        title={`${c.type} · expires ${shortDate(c.expiresOn)}`}
                        className={`badge ${s === "current" ? "badge-good" : s === "expiring" ? "badge-warning" : "badge-critical"}`}
                      >
                        {c.type.replace(" (NFPA 70E)", "").replace(" Authorized", "").replace(" / CPR", "")}
                      </span>
                    );
                  })}
                </div>
                {(expired > 0 || expiring > 0) && (
                  <p className="mt-3 text-xs text-foreground/50">
                    {expired > 0 && <span className="font-medium tone-critical">{expired} expired</span>}
                    {expired > 0 && expiring > 0 && " · "}
                    {expiring > 0 && <span className="font-medium tone-warning">{expiring} expiring</span>}
                  </p>
                )}
              </section>
            );
          })}
        </div>

        {caps.canManageSettings && available.length > 0 && (
          <form action={addCrewMemberAction} className="card flex flex-wrap items-center gap-3 p-4">
            <input type="hidden" name="projectId" value={projectId} />
            <span className="text-sm font-medium text-foreground/70">Add to crew</span>
            <select name="userId" className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm" defaultValue="">
              <option value="" disabled>Choose someone…</option>
              {available.map((u) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName} · {u.title}</option>
              ))}
            </select>
            <button type="submit" className="rounded-lg bg-sidebar-accent px-3.5 py-1.5 text-sm font-semibold text-white">
              Add
            </button>
          </form>
        )}
      </div>
    );
  }
}
