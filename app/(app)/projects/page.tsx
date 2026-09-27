import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { getTemplate, listInspectionsForProject, listProjects } from "@/lib/db";
import { hazardBreakdown, projectHealth, weeklySeries } from "@/lib/metrics";
import { timeAgo } from "@/lib/format";
import { ScoreRing } from "@/components/viz/score-ring";
import { Sparkline } from "@/components/viz/sparkline";
import { RiskBadge } from "@/components/ui/badges";
import { IconArrowRight, IconMapPin, IconPlus } from "@/components/ui/icons";

const levelLabel = { low: "Strong", medium: "Watch", high: "At risk", critical: "Critical" } as const;

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  const projects = listProjects(user.companyId);
  const canManage = getCapabilities(user.role).canManageSettings;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
        {canManage && (
          <Link
            href="/projects/new"
            className="flex items-center gap-1.5 rounded-lg bg-sidebar-accent px-3.5 py-2 text-sm font-semibold text-white"
          >
            <IconPlus width={14} height={14} />
            New project
          </Link>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-12 text-center">
          <p className="text-sm font-medium">No projects yet</p>
          <p className="max-w-sm text-xs text-foreground/50">
            {canManage
              ? "Create the first project to start logging inspections and tracking safety."
              : "An administrator needs to create a project before there is anything to inspect."}
          </p>
        </div>
      ) : (
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {projects.map((project) => {
          const h = projectHealth(project);
          const series = weeklySeries(user.companyId, project.id, 12);
          const top = hazardBreakdown(user.companyId, project.id)[0];
          const last = listInspectionsForProject(project.id)[0];
          return (
            <Link key={project.id} href={`/projects/${project.id}`} className="card group overflow-hidden transition-shadow hover:shadow-lg">
              <div className="relative overflow-hidden p-6" style={{ borderRadius: "1.25rem 1.25rem 0 0" }}>
                <div className="absolute inset-0 z-0">
                  <Image src={`/${project.id}.jpg`} alt={project.shortName} fill className="object-cover opacity-60 mix-blend-overlay transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/70 to-background/30 backdrop-blur-[2px]" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/80">
                        <IconMapPin width={12} height={12} />
                        {project.location} · {project.projectNumber}
                      </p>
                      <h2 className="mt-1.5 text-xl font-bold leading-snug tracking-tight shadow-black drop-shadow-sm">{project.name}</h2>
                      <p className="mt-1 text-xs font-medium text-foreground/70 drop-shadow-sm">{project.client}</p>
                    </div>
                    <div className="rounded-lg bg-background/50 p-1 shadow-sm backdrop-blur-md">
                      <ScoreRing score={h.score} level={h.level} size={84} stroke={8} onDark />
                    </div>
                  </div>
                  <div className="mt-5">
                    <div className="mb-1.5 flex justify-between text-[11px] font-medium uppercase tracking-wider text-foreground/80">
                      <span>Construction progress</span>
                      <span className="font-bold text-foreground drop-shadow-sm">{project.percentComplete}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-background/30 shadow-inner backdrop-blur-md">
                      <div className="h-1.5 rounded-full bg-sidebar-accent shadow-sm" style={{ width: `${project.percentComplete}%` }} />
                    </div>
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
      )}
    </div>
  );
}
