import Link from "next/link";
import { getTemplate, listInspectionsForProject, listProjects } from "@/lib/db";
import { hazardBreakdown, projectHealth, weeklySeries } from "@/lib/metrics";
import { timeAgo } from "@/lib/format";
import { ScoreRing } from "@/components/viz/score-ring";
import { Sparkline } from "@/components/viz/sparkline";
import { RiskBadge } from "@/components/ui/badges";
import { IconArrowRight, IconMapPin } from "@/components/ui/icons";

const levelLabel = { low: "Strong", medium: "Watch", high: "At risk", critical: "Critical" } as const;

export default async function ProjectsPage() {
  const projects = listProjects();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {projects.map((project) => {
          const h = projectHealth(project);
          const series = weeklySeries(project.id, 12);
          const top = hazardBreakdown(project.id)[0];
          const last = listInspectionsForProject(project.id)[0];
          return (
            <Link key={project.id} href={`/projects/${project.id}`} className="card group overflow-hidden transition-shadow hover:shadow-lg">
              <div className="hero p-5" style={{ borderRadius: 0 }}>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/55">
                      <IconMapPin width={12} height={12} />
                      {project.location} · {project.projectNumber}
                    </p>
                    <h2 className="mt-1.5 text-lg font-semibold leading-snug">{project.name}</h2>
                    <p className="mt-1 text-xs text-white/60">{project.client}</p>
                  </div>
                  <ScoreRing score={h.score} level={h.level} size={84} stroke={8} onDark />
                </div>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-[11px] text-white/60">
                    <span>Construction progress</span>
                    <span className="font-semibold text-white">{project.percentComplete}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10">
                    <div className="h-1.5 rounded-full bg-white/80" style={{ width: `${project.percentComplete}%` }} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 border-b border-border px-5 py-4 text-center">
                {[
                  { v: h.openActions, l: "open actions" },
                  { v: h.overdue, l: "overdue", warn: h.overdue > 0 },
                  { v: h.pendingReviews, l: "to review" },
                  { v: project.headcount, l: "on site" },
                ].map((s) => (
                  <div key={s.l}>
                    <p className={`text-xl font-semibold ${s.warn ? "tone-critical" : ""}`}>{s.v}</p>
                    <p className="text-[11px] text-foreground/45">{s.l}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0 text-xs text-foreground/55">
                  <p className="flex items-center gap-2">
                    <RiskBadge level={h.level} />
                    <span className="font-medium text-foreground">{levelLabel[h.level]}</span>
                  </p>
                  {top && <p className="mt-2 truncate">Top issue: <span className="font-medium text-foreground">{top.category}</span> ({top.count})</p>}
                  {last && <p className="mt-0.5 truncate">Last inspection {timeAgo(new Date(last.submittedAt).getTime())} · {getTemplate(last.templateId)?.name}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Sparkline values={series.map((p) => p.raised)} width={96} height={34} />
                  <IconArrowRight width={16} height={16} className="text-foreground/25 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
