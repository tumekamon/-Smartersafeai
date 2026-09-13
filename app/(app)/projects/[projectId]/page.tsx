import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import {
  getProject,
  getTemplate,
  getUser,
  listCorrectiveActionsForProject,
  listInspectionsForProject,
  listTemplates,
} from "@/lib/db";
import { Card, CardHeader } from "@/components/ui/card";
import {
  CorrectiveActionStatusBadge,
  InspectionStatusBadge,
  RiskBadge,
} from "@/components/ui/badges";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = getProject(projectId);
  if (!project) notFound();

  const user = await getCurrentUser();
  const capabilities = getCapabilities(user.role);

  const inspections = listInspectionsForProject(projectId).sort((a, b) =>
    a.date < b.date ? 1 : -1
  );
  const correctiveActions = listCorrectiveActionsForProject(projectId);
  const templates = listTemplates();

  const riskLevel =
    project.riskScore >= 70
      ? ("critical" as const)
      : project.riskScore >= 50
        ? ("high" as const)
        : project.riskScore >= 30
          ? ("medium" as const)
          : ("low" as const);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-foreground/50">
            {project.projectNumber} · {project.location}
          </p>
          <h1 className="text-xl font-semibold">{project.name}</h1>
          <p className="mt-1 text-sm text-foreground/60">GC / Client: {project.client}</p>
        </div>
        <RiskBadge level={riskLevel} />
      </div>

      {capabilities.canSubmitInspections && (
        <Card>
          <CardHeader
            title="Start a new inspection"
            description="Pick a template — evidence and AI analysis requirements are configured per template"
          />
          <div className="flex flex-wrap gap-2">
            {templates.map((t) => (
              <Link
                key={t.id}
                href={`/projects/${projectId}/inspections/new?templateId=${t.id}`}
                className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:border-sidebar-accent hover:text-sidebar-accent"
              >
                {t.name}
              </Link>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Inspections"
          description={`${inspections.length} logged for this project`}
        />
        {inspections.length === 0 ? (
          <p className="text-sm text-foreground/50">No inspections yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {inspections.map((i) => {
              const template = getTemplate(i.templateId);
              const inspector = getUser(i.inspectorId);
              return (
                <li key={i.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <Link
                      href={`/inspections/${i.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {template?.name}
                    </Link>
                    <p className="text-xs text-foreground/50">
                      {i.date} · {inspector?.firstName} {inspector?.lastName}
                    </p>
                  </div>
                  <InspectionStatusBadge status={i.status} />
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Corrective Actions"
          description={`${correctiveActions.length} tracked for this project`}
          action={
            <Link
              href="/corrective-actions"
              className="text-xs font-medium text-sidebar-accent"
            >
              Manage all
            </Link>
          }
        />
        {correctiveActions.length === 0 ? (
          <p className="text-sm text-foreground/50">No corrective actions yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {correctiveActions.map((ca) => {
              const assignee = getUser(ca.assignedToId);
              return (
                <li key={ca.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{ca.description}</p>
                    <p className="text-xs text-foreground/50">
                      {assignee?.firstName} {assignee?.lastName} · Due {ca.dueDate}
                    </p>
                  </div>
                  <CorrectiveActionStatusBadge status={ca.status} />
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
