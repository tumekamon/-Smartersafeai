import Link from "next/link";
import type { Project, User } from "@/lib/types";
import {
  activityFeed,
  attentionQueue,
  closureStats,
  hazardBreakdown,
  heatmap,
  hotspots,
  insights,
  isActionOverdue,
  projectHealth,
  riskLevelFromScore,
  safetyScore,
  weeklySeries,
} from "@/lib/metrics";
import { listCorrectiveActions, listFindings, listProjects } from "@/lib/db";
import { greeting } from "@/lib/format";
import { ScoreRing } from "@/components/viz/score-ring";
import { Sparkline } from "@/components/viz/sparkline";
import { TrendChart } from "@/components/viz/trend-chart";
import { HeatMap } from "@/components/viz/heat-map";
import { BreakdownBars } from "@/components/ui/breakdown-bars";
import { AttentionList } from "@/components/dashboard/attention-list";
import { InsightCard } from "@/components/dashboard/insight-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { ComplianceStrip } from "@/components/dashboard/compliance-strip";
import { ProjectSwitcher } from "@/components/dashboard/project-switcher";
import { RiskBadge } from "@/components/ui/badges";
import { IconArrowRight, IconMapPin, IconSparkle, IconClock, IconCheck } from "@/components/ui/icons";

const levelLabel = { low: "Strong", medium: "Watch", high: "At risk", critical: "Critical" } as const;

function SubScore({ label, value }: { label: string; value: number }) {
  const color = value >= 85 ? "var(--status-good)" : value >= 72 ? "var(--status-warning)" : value >= 58 ? "var(--status-serious)" : "var(--status-critical)";
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="hero-muted">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="hero-track h-1.5 rounded-full">
        <div className="h-1.5 rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function HeroStat({ label, value, values, color }: { label: string; value: string | number; values?: number[]; color: string }) {
  return (
    <div className="hero-tile rounded-xl p-3.5">
      <p className="hero-muted text-[11px] font-medium uppercase tracking-wider">{label}</p>
      <div className="mt-1.5 flex items-end justify-between gap-2">
        <p className="text-3xl font-semibold leading-none tracking-tight">{value}</p>
        {values && <Sparkline values={values} width={84} height={30} color={color} ring="var(--hero-to)" />}
      </div>
    </div>
  );
}

export function ManagerDashboard({ user, project }: { user: User; project?: Project }) {
  const projectId = project?.id;
  const projects = listProjects();
  const score = safetyScore(projectId);
  const level = riskLevelFromScore(score.score);
  const series = weeklySeries(projectId, 12);
  const actions = (projectId ? listCorrectiveActions().filter((a) => a.projectId === projectId) : listCorrectiveActions());
  const findings = (projectId ? listFindings().filter((f) => f.projectId === projectId) : listFindings());
  const open = actions.filter((a) => a.status === "open").length;
  const overdue = actions.filter((a) => isActionOverdue(a)).length;
  const pending = findings.filter((f) => f.reviewerDecision === "pending").length;
  const closure = closureStats(projectId);

  const attention = attentionQueue(8, projectId);
  const aiInsights = insights(projectId);
  const hazards = hazardBreakdown(projectId).slice(0, 6);
  const feed = activityFeed(8, projectId);
  const heatTargets = projectId ? [project!] : projects;
  const spots = hotspots(projectId, 4);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {greeting()}, {user.firstName}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {pending > 0 && (
              <span className="badge badge-serious text-[11px] py-1 px-2.5">
                <IconSparkle width={13} height={13} />
                {pending} pending review{pending === 1 ? "" : "s"}
              </span>
            )}
            {overdue > 0 && (
              <span className="badge badge-critical text-[11px] py-1 px-2.5">
                <IconClock width={13} height={13} />
                {overdue} overdue action{overdue === 1 ? "" : "s"}
              </span>
            )}
            {pending === 0 && overdue === 0 && (
              <span className="badge badge-good text-[11px] py-1 px-2.5">
                <IconCheck width={13} height={13} />
                All clear
              </span>
            )}
          </div>
        </div>
        <ProjectSwitcher projects={projects} selectedId={projectId} />
      </div>

      <section className="hero p-6 md:p-7">
        <div className="grid items-center gap-7 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="flex items-center gap-5">
            <ScoreRing score={score.score} level={level} size={156} stroke={13} onDark label="Safety score" />
            <div>
              <p className="hero-muted text-[11px] font-semibold uppercase tracking-wider">
                {project ? project.shortName : "All sites"}
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{levelLabel[level]}</p>
            </div>
          </div>

          <div className="space-y-3 lg:px-4">
            <SubScore label="Inspection results" value={score.inspections} />
            <SubScore label="Action closure" value={score.actions} />
            <SubScore label="Training compliance" value={score.training} />
            <SubScore label="Finding trend" value={score.trend} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <HeroStat label="Findings / week" value={series[series.length - 1].raised} values={series.map((p) => p.raised)} color="var(--chart-series-1)" />
            <HeroStat label="Inspections / week" value={series[series.length - 1].inspections} values={series.map((p) => p.inspections)} color="var(--chart-series-3)" />
            <HeroStat label="Open actions" value={open} color="var(--chart-series-1)" />
            <HeroStat label="Avg. days to close" value={closure.avgDays.toFixed(1)} color="var(--chart-series-1)" />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <section className="card p-6 lg:col-span-3">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Needs your attention</h2>
            {pending > 0 && (
              <Link href="/review" className="rounded-full bg-ai-soft px-3 py-1 text-xs font-semibold text-ai">
                Open review queue ({pending})
              </Link>
            )}
          </div>
          <AttentionList items={attention} />
        </section>

        <section className="grid auto-rows-fr gap-3 lg:col-span-2">
          {aiInsights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <section className="card p-6 lg:col-span-3">
          <h2 className="mb-3 text-sm font-semibold">Findings vs. closures</h2>
          <TrendChart points={series} />
        </section>

        <section className="card p-6 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold">What is going wrong</h2>
          <BreakdownBars items={hazards.map((h) => ({ label: h.category, value: h.count, tone: "info" as const }))} />
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <section className="card p-6 lg:col-span-3">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <IconMapPin width={15} height={15} className="text-foreground/50" />
            Where findings are happening
          </h2>
          <div className={heatTargets.length > 1 ? "grid gap-6 md:grid-cols-3" : ""}>
            {heatTargets.map((p) => {
              const h = heatmap(p.id);
              return (
                <div key={p.id}>
                  {heatTargets.length > 1 && (
                    <p className="mb-2 text-xs font-semibold">{p.shortName}</p>
                  )}
                  <HeatMap levels={h.levels} zones={h.zones} cells={h.cells} max={h.max} compact={heatTargets.length > 1} />
                </div>
              );
            })}
          </div>
          {spots.length > 0 && (
            <div className="mt-6 border-t border-border pt-4">
              <p className="eyebrow mb-3">Top hotspots</p>
              <ol className="space-y-2.5">
                {spots.map((s, i) => (
                  <li key={`${s.project.id}${s.level}${s.zone}`} className="flex items-center gap-3 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-foreground/60">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">
                        {s.level} {s.zone}
                      </span>
                      <span className="text-foreground/50"> · {s.project.shortName} · mostly {s.dominant.toLowerCase()}</span>
                    </span>
                    {s.high > 0 && <span className="badge badge-serious">{s.high} high</span>}
                    <span className="w-16 text-right text-sm font-semibold">{s.count} <span className="text-xs font-normal text-foreground/45">findings</span></span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>

        <section className="card p-6 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold">Live activity</h2>
          <ActivityFeed events={feed} />
        </section>
      </div>

      <ComplianceStrip />

      {!project && (
        <section>
          <h2 className="mb-3 text-sm font-semibold">Project health</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {projects.map((p) => {
              const h = projectHealth(p);
              return (
                <Link key={p.id} href={`/projects/${p.id}`} className="card group p-6 transition-shadow hover:shadow-md">
                  <div className="flex items-center gap-4">
                    <ScoreRing score={h.score} level={h.level} size={76} stroke={8} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{p.shortName}</p>
                      <p className="text-xs text-foreground/50">{p.location}</p>
                      <div className="mt-1.5">
                        <RiskBadge level={h.level} />
                      </div>
                    </div>
                  </div>
                  <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <dd className="text-lg font-semibold">{h.openActions}</dd>
                      <dt className="text-[11px] text-foreground/50">open</dt>
                    </div>
                    <div>
                      <dd className={`text-lg font-semibold ${h.overdue ? "tone-critical" : ""}`}>{h.overdue}</dd>
                      <dt className="text-[11px] text-foreground/50">overdue</dt>
                    </div>
                    <div>
                      <dd className="text-lg font-semibold">{h.pendingReviews}</dd>
                      <dt className="text-[11px] text-foreground/50">to review</dt>
                    </div>
                  </dl>
                  <p className="mt-4 flex items-center gap-1 text-xs font-medium text-sidebar-accent">
                    Open project
                    <IconArrowRight width={13} height={13} className="transition-transform group-hover:translate-x-0.5" />
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
