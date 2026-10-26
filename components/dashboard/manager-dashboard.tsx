import Link from "next/link";
import Image from "next/image";
import type { Project, User } from "@/lib/types";
import {
  activityFeed,
  attentionQueue,
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
import { listCorrectiveActions, listFindings, getCompany } from "@/lib/db";
import { sitesFor } from "@/lib/scope";
import { greeting } from "@/lib/format";
import { ScoreRing } from "@/components/viz/score-ring";
import { StatTiles } from "@/components/dashboard/stat-tiles";
import { TrendChart } from "@/components/viz/trend-chart";
import { HeatMap } from "@/components/viz/heat-map";
import { BreakdownBars } from "@/components/ui/breakdown-bars";
import { AttentionList } from "@/components/dashboard/attention-list";
import { InsightCard } from "@/components/dashboard/insight-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { ComplianceStrip } from "@/components/dashboard/compliance-strip";
import { ProjectSwitcher } from "@/components/dashboard/project-switcher";
import { RiskBadge } from "@/components/ui/badges";
import { IconAlertTriangle, IconArrowRight, IconBolt, IconBuilding, IconCheck, IconClock, IconMapPin, IconSparkle, IconTrendUp } from "@/components/ui/icons";
import { SectionHeader } from "@/components/ui/section-header";
import { hiddenModules, tileChoiceFor, visibleSections, type SectionId } from "@/lib/home-layout";

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

export function ManagerDashboard({
  user,
  project,
  canCustomize,
  showAllSites = true,
}: {
  user: User;
  project?: Project;
  canCustomize: boolean;
  showAllSites?: boolean;
}) {
  const projectId = project?.id;
  const company = getCompany(user.companyId);
  const projects = sitesFor(user);
  const score = safetyScore(user.companyId, projectId);
  const level = riskLevelFromScore(score.score);
  const series = weeklySeries(user.companyId, projectId, 12);
  const actions = (projectId ? listCorrectiveActions(user.companyId).filter((a) => a.projectId === projectId) : listCorrectiveActions(user.companyId));
  const findings = (projectId ? listFindings(user.companyId).filter((f) => f.projectId === projectId) : listFindings(user.companyId));
  const overdue = actions.filter((a) => isActionOverdue(a)).length;
  const pending = findings.filter((f) => f.reviewerDecision === "pending").length;

  const attention = attentionQueue(user.companyId, 8, projectId);
  const aiInsights = insights(user.companyId, projectId);
  const hazards = hazardBreakdown(user.companyId, projectId).slice(0, 6);
  const feed = activityFeed(user.companyId, 8, projectId);
  const heatTargets = projectId ? [project!] : projects;
  const spots = hotspots(user.companyId, projectId, 4);

  const show = visibleSections(company, user.role);
  const hidden = hiddenModules(company, user);
  // In a two-up row, a card fills the full width when its partner is switched off.
  const span = (a: SectionId, b: SectionId, wide: boolean) =>
    show.has(a) && show.has(b) ? (wide ? "lg:col-span-3" : "lg:col-span-2") : "lg:col-span-5";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {greeting()}, {user.firstName}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {pending > 0 && (
              <Link href="/review" className="badge badge-serious min-h-9 px-3 text-sm">
                <IconSparkle width={15} height={15} />
                {pending} to review
              </Link>
            )}
            {overdue > 0 && (
              <Link href="/corrective-actions?view=overdue" className="badge badge-critical min-h-9 px-3 text-sm">
                <IconClock width={15} height={15} />
                {overdue} overdue
              </Link>
            )}
            {pending === 0 && overdue === 0 && (
              <span className="badge badge-good min-h-9 px-3 text-sm">
                <IconCheck width={15} height={15} />
                All clear
              </span>
            )}
          </div>
        </div>
        <ProjectSwitcher projects={projects} selectedId={projectId} showAll={showAllSites} />
      </div>

      {show.has("score") && (
        <section className="relative overflow-hidden rounded-3xl border border-border/50 shadow-2xl shadow-brand/5 transition-all">
          <div className="absolute inset-0 z-0">
            <Image src={company?.heroImage ?? "/bg-hero.jpg"} alt="Hero background" fill className="object-cover opacity-40 mix-blend-overlay" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/30 backdrop-blur-[6px]" />
          </div>
          <div className="relative z-10 p-6 md:p-10">
            <div className="grid items-center gap-8 lg:grid-cols-[auto_minmax(0,1fr)]">
              <div className="flex items-center gap-6">
                <div className="rounded-lg bg-background/50 p-1.5 shadow-sm backdrop-blur-md">
                  <ScoreRing score={score.score} level={level} size={156} stroke={13} onDark label="Safety score" />
                </div>
                <div>
                  <p className="hero-muted text-[11px] font-semibold uppercase tracking-wider text-foreground/80">
                    {project ? project.shortName : "All sites"}
                  </p>
                  <p className="mt-1 text-3xl font-bold tracking-tight shadow-black drop-shadow-sm">{levelLabel[level]}</p>
                </div>
              </div>

              <div className="space-y-4 lg:px-6">
                <SubScore label="Inspection results" value={score.inspections} />
                <SubScore label="Action closure" value={score.actions} />
                <SubScore label="Training compliance" value={score.training} />
                <SubScore label="Finding trend" value={score.trend} />
              </div>
            </div>
          </div>
        </section>
      )}

      {show.has("tiles") && (
        <StatTiles companyId={user.companyId} projectId={projectId} saved={tileChoiceFor(company, user)} canEdit={canCustomize && company?.allowPersonalTiles !== false} hidden={hidden} />
      )}

      {(show.has("attention") || show.has("insights")) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {show.has("attention") && (
            <section className={`card p-5 md:p-6 ${span("attention", "insights", true)}`}>
              <SectionHeader
                Icon={IconBolt}
                title="Needs your attention"
                tone="critical"
                action={
                  pending > 0 && (
                    <Link href="/review" className="flex min-h-10 items-center rounded-lg bg-ai-soft px-3 text-sm font-semibold text-ai">
                      Review ({pending})
                    </Link>
                  )
                }
              />
              <AttentionList items={attention} />
            </section>
          )}

          {show.has("insights") && (
            <section className={`grid auto-rows-fr gap-3 ${span("insights", "attention", false)}`}>
              {aiInsights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </section>
          )}
        </div>
      )}

      {(show.has("trend") || show.has("hazards")) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {show.has("trend") && (
            <section className={`card p-5 md:p-6 ${span("trend", "hazards", true)}`}>
              <SectionHeader Icon={IconTrendUp} title="Findings vs. closures" />
              <TrendChart points={series} />
            </section>
          )}

          {show.has("hazards") && (
            <section className={`card p-5 md:p-6 ${span("hazards", "trend", false)}`}>
              <SectionHeader Icon={IconAlertTriangle} title="What is going wrong" tone="warning" />
              <BreakdownBars items={hazards.map((h) => ({ label: h.category, value: h.count, tone: "info" as const }))} />
            </section>
          )}
        </div>
      )}

      {(show.has("heatmap") || show.has("activity")) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {show.has("heatmap") && (
            <section className={`card p-5 md:p-6 ${span("heatmap", "activity", true)}`}>
              <SectionHeader Icon={IconMapPin} title="Where findings happen" />
              <div className={heatTargets.length > 1 ? "grid gap-6 md:grid-cols-3" : ""}>
                {heatTargets.map((p) => {
                  const h = heatmap(user.companyId, p.id);
                  return (
                    <div key={p.id}>
                      {heatTargets.length > 1 && <p className="mb-2 text-sm font-bold">{p.shortName}</p>}
                      <HeatMap levels={h.levels} zones={h.zones} cells={h.cells} max={h.max} compact={heatTargets.length > 1} />
                    </div>
                  );
                })}
              </div>
              {spots.length > 0 && (
                <div className="mt-6 border-t border-border pt-4">
                  <p className="mb-3 text-sm font-bold text-foreground/70">Top hotspots</p>
                  <ol className="space-y-2">
                    {spots.map((s, i) => (
                      <li key={`${s.project.id}${s.level}${s.zone}`} className="flex min-h-11 items-center gap-3 rounded-xl bg-surface-muted/60 px-3 text-sm">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface text-sm font-bold">
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          <span className="font-bold">{s.level} {s.zone}</span>
                          <span className="text-foreground/55"> · {s.project.shortName} · {s.dominant}</span>
                        </span>
                        {s.high > 0 && <span className="badge badge-serious">{s.high} high</span>}
                        <span className="text-base font-extrabold">{s.count}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </section>
          )}

          {show.has("activity") && (
            <section className={`card p-5 md:p-6 ${span("activity", "heatmap", false)}`}>
              <SectionHeader Icon={IconClock} title="Live activity" tone="good" />
              <ActivityFeed events={feed} />
            </section>
          )}
        </div>
      )}

      {show.has("compliance") && !hidden.includes("compliance") && <ComplianceStrip companyId={user.companyId} />}

      {show.has("projects") && !project && (
        <section>
          <SectionHeader Icon={IconBuilding} title="Project health" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {projects.map((p) => {
              const h = projectHealth(p);
              return (
                <Link key={p.id} href={`/projects/${p.id}`} className="card group relative overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg">
                  <div className="absolute inset-0 z-0">
                    <Image src={`/${p.id}.jpg`} alt={p.shortName} fill className="object-cover opacity-60 mix-blend-overlay transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/80 to-background/30 backdrop-blur-[2px]" />
                  </div>

                  <div className="relative z-10 p-6">
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-background/50 p-1 backdrop-blur-md">
                        <ScoreRing score={h.score} level={h.level} size={76} stroke={8} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-lg font-semibold tracking-tight shadow-black drop-shadow-sm">{p.shortName}</p>
                        <p className="text-xs font-medium text-foreground/70 drop-shadow-sm">{p.location}</p>
                        <div className="mt-1.5">
                          <RiskBadge level={h.level} />
                        </div>
                      </div>
                    </div>
                    <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-background/60 p-2.5 backdrop-blur-md">
                        <dd className="text-2xl font-extrabold">{h.openActions}</dd>
                        <dt className="text-xs font-semibold text-foreground/60">open</dt>
                      </div>
                      <div className={`rounded-xl p-2.5 backdrop-blur-md ${h.overdue ? "bg-status-critical text-white" : "bg-background/60"}`}>
                        <dd className="text-2xl font-extrabold">{h.overdue}</dd>
                        <dt className={`text-xs font-semibold ${h.overdue ? "text-white/90" : "text-foreground/60"}`}>overdue</dt>
                      </div>
                      <div className="rounded-xl bg-background/60 p-2.5 backdrop-blur-md">
                        <dd className="text-2xl font-extrabold">{h.pendingReviews}</dd>
                        <dt className="text-xs font-semibold text-foreground/60">to review</dt>
                      </div>
                    </dl>
                    <p className="mt-4 flex items-center gap-1 text-sm font-bold text-sidebar-accent">
                      Open project
                      <IconArrowRight width={15} height={15} className="transition-transform group-hover:translate-x-1" />
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
