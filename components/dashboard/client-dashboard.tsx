import Link from "next/link";
import type { User } from "@/lib/types";
import { listGcNotices, listProjects } from "@/lib/db";
import { closureStats, projectHealth, riskLevelFromScore, safetyScore, trainingSummary, weeklySeries } from "@/lib/metrics";
import { greeting, shortDate } from "@/lib/format";
import { ScoreRing } from "@/components/viz/score-ring";
import { TrendChart } from "@/components/viz/trend-chart";
import { RiskBadge } from "@/components/ui/badges";
import { IconArrowRight } from "@/components/ui/icons";

const noticeTone = { open: "badge-warning", acknowledged: "badge-info", resolved: "badge-good" } as const;

export function ClientDashboard({ user }: { user: User }) {
  const projects = listProjects(user.companyId);
  const score = safetyScore(user.companyId);
  const level = riskLevelFromScore(score.score);
  const series = weeklySeries(user.companyId, undefined, 12);
  const closure = closureStats(user.companyId);
  const training = trainingSummary(user.companyId);
  const notices = listGcNotices(user.companyId).slice(0, 5);
  const inspections30 = projects.reduce((s, p) => s + projectHealth(p).inspections30, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {greeting()}, {user.firstName}
        </h1>
        <p className="mt-1 text-sm text-foreground/60">Read-only</p>
      </div>

      <section className="hero p-6 md:p-7">
        <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
          <ScoreRing score={score.score} level={level} size={150} stroke={12} onDark label="Safety score" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Inspections, 30 days", value: inspections30 },
              { label: "On-time action closure", value: `${closure.onTimePercent}%` },
              { label: "Avg. days to close", value: closure.avgDays.toFixed(1) },
              { label: "Training valid", value: `${Math.round(training.compliantPercent)}%` },
            ].map((s) => (
              <div key={s.label} className="hero-tile rounded-xl p-3.5">
                <p className="hero-muted text-[11px] font-medium uppercase tracking-wider">{s.label}</p>
                <p className="mt-1.5 text-3xl font-semibold leading-none tracking-tight">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <section className="card p-5 lg:col-span-3">
          <h2 className="mb-3 text-sm font-semibold">Findings raised vs. actions closed</h2>
          <TrendChart points={series} />
        </section>
        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">Coordination notices</h2>
          <ul className="divide-y divide-border">
            {notices.map((n) => (
              <li key={n.id} className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium leading-snug">{n.trade}</p>
                  <span className={`badge capitalize ${noticeTone[n.status]}`}>{n.status}</span>
                </div>
                <p className="mt-1 text-xs text-foreground/60">{n.issue}</p>
                <p className="mt-1 text-[11px] text-foreground/40">{shortDate(n.raisedAt)}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Projects</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {projects.map((p) => {
            const h = projectHealth(p);
            return (
              <Link key={p.id} href={`/projects/${p.id}`} className="card group flex items-center gap-4 p-5 transition-shadow hover:shadow-md">
                <ScoreRing score={h.score} level={h.level} size={72} stroke={8} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.shortName}</p>
                  <p className="text-xs text-foreground/50">{p.percentComplete}% complete</p>
                  <div className="mt-1.5"><RiskBadge level={h.level} /></div>
                </div>
                <IconArrowRight width={15} height={15} className="text-foreground/25 transition-transform group-hover:translate-x-0.5" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
