import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { getCompany, listInspectionsForProject, listProjects } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { RiskBadge } from "@/components/ui/badges";

function riskLevelFromScore(score: number) {
  if (score >= 70) return "critical" as const;
  if (score >= 50) return "high" as const;
  if (score >= 30) return "medium" as const;
  return "low" as const;
}

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  const company = getCompany(user.companyId);
  const projects = listProjects();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Projects</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Every project {company?.name} is tracking independently of the GC&apos;s records.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {projects.map((project) => {
          const inspections = listInspectionsForProject(project.id);
          return (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="h-full transition-colors hover:border-sidebar-accent">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold">{project.name}</h2>
                    <p className="mt-1 text-xs text-foreground/50">
                      {project.projectNumber} · {project.location}
                    </p>
                  </div>
                  <RiskBadge level={riskLevelFromScore(project.riskScore)} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-foreground/50">GC / Client</dt>
                    <dd className="font-medium">{project.client}</dd>
                  </div>
                  <div>
                    <dt className="text-foreground/50">Status</dt>
                    <dd className="font-medium capitalize">{project.status.replace("_", " ")}</dd>
                  </div>
                  <div>
                    <dt className="text-foreground/50">Started</dt>
                    <dd className="font-medium">{project.startDate}</dd>
                  </div>
                  <div>
                    <dt className="text-foreground/50">Inspections</dt>
                    <dd className="font-medium">{inspections.length}</dd>
                  </div>
                </dl>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
