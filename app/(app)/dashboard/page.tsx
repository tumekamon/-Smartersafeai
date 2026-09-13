import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import {
  getProject,
  getTemplate,
  getUser,
  listCorrectiveActions,
  listFindings,
  listInspections,
  listProjects,
} from "@/lib/db";
import { StatTile } from "@/components/ui/stat-tile";
import { BreakdownBars } from "@/components/ui/breakdown-bars";
import { Card, CardHeader } from "@/components/ui/card";
import {
  CorrectiveActionStatusBadge,
  InspectionStatusBadge,
  RiskBadge,
} from "@/components/ui/badges";
import {
  IconAlertTriangle,
  IconClipboardCheck,
  IconClock,
  IconEye,
  IconGauge,
} from "@/components/ui/icons";

function riskLevelFromScore(score: number) {
  if (score >= 70) return "critical" as const;
  if (score >= 50) return "high" as const;
  if (score >= 30) return "medium" as const;
  return "low" as const;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const capabilities = getCapabilities(user.role);

  const projects = listProjects();
  const inspections = listInspections();
  const findings = listFindings();
  const correctiveActions = listCorrectiveActions();

  const today = new Date();
  const isOverdue = (dueDate: string, status: string) =>
    (status === "open" || status === "completed") && new Date(dueDate) < today;

  if (!capabilities.canViewOrgDashboard && !capabilities.isReadOnly) {
    // Personal, task-focused view — Worker role. No org KPIs, no AI review access.
    const myActions = correctiveActions
      .filter((c) => c.assignedToId === user.id)
      .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
    const myInspections = inspections
      .filter((i) => i.inspectorId === user.id)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 5);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Welcome back, {user.firstName}</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Here&apos;s what&apos;s assigned to you across all your projects.
          </p>
        </div>

        <Card>
          <CardHeader
            title="Start a new inspection"
            description="Pick a project to begin a checklist"
            action={
              <Link
                href="/projects"
                className="rounded-md bg-sidebar-accent px-3 py-1.5 text-xs font-medium text-white"
              >
                Choose project
              </Link>
            }
          />
        </Card>

        <Card>
          <CardHeader title="My corrective actions" description={`${myActions.length} assigned to you`} />
          {myActions.length === 0 ? (
            <p className="text-sm text-foreground/50">Nothing assigned right now.</p>
          ) : (
            <ul className="divide-y divide-border">
              {myActions.map((ca) => (
                <li key={ca.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{ca.description}</p>
                    <p className="text-xs text-foreground/50">
                      {getProject(ca.projectId)?.name} · Due {ca.dueDate}
                    </p>
                  </div>
                  <CorrectiveActionStatusBadge status={ca.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="My recent inspections" />
          {myInspections.length === 0 ? (
            <p className="text-sm text-foreground/50">You haven&apos;t submitted an inspection yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {myInspections.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <Link href={`/inspections/${i.id}`} className="text-sm font-medium hover:underline">
                      {getTemplate(i.templateId)?.name}
                    </Link>
                    <p className="text-xs text-foreground/50">
                      {getProject(i.projectId)?.name} · {i.date}
                    </p>
                  </div>
                  <InspectionStatusBadge status={i.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    );
  }

  if (capabilities.isReadOnly) {
    // Client Viewer — external, read-only safety performance summary only.
    const avgRisk = projects.length
      ? Math.round(projects.reduce((sum, p) => sum + p.riskScore, 0) / projects.length)
      : 0;
    const openActions = correctiveActions.filter((c) => c.status === "open").length;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Safety Performance Summary</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Read-only view. Internal review queues and task assignments are not shown here.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <StatTile label="Open Items" value={openActions} tone="warning" icon={IconClipboardCheck} />
          <StatTile label="Inspections Logged" value={inspections.length} tone="info" icon={IconEye} />
          <StatTile
            label="Avg. Project Risk"
            value={avgRisk}
            tone={avgRisk > 50 ? "warning" : "good"}
            icon={IconGauge}
          />
        </div>

        <Card>
          <CardHeader title="Project Risk Overview" />
          <ul className="divide-y divide-border">
            {projects.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <Link href={`/projects/${p.id}`} className="text-sm font-medium hover:underline">
                    {p.name}
                  </Link>
                  <p className="text-xs text-foreground/50">{p.location}</p>
                </div>
                <RiskBadge level={riskLevelFromScore(p.riskScore)} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    );
  }

  // Safety professionals & supervisors — full org dashboard.
  const openActions = correctiveActions.filter((c) => c.status === "open");
  const overdueActions = correctiveActions.filter((c) => isOverdue(c.dueDate, c.status));
  const pendingReviews = findings.filter((f) => f.reviewerDecision === "pending");
  const highRiskFindings = findings.filter((f) => f.riskLevel === "high" || f.riskLevel === "critical");
  const avgRisk = projects.length
    ? Math.round(projects.reduce((sum, p) => sum + p.riskScore, 0) / projects.length)
    : 0;

  const recentInspections = [...inspections].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5);
  const upcomingActions = [...correctiveActions]
    .filter((c) => c.status !== "closed")
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))
    .slice(0, 5);

  const findingsByRisk = (["critical", "high", "medium", "low"] as const).map((level) => ({
    label: level,
    value: findings.filter((f) => f.riskLevel === level).length,
    tone:
      level === "critical" ? ("critical" as const) : level === "high" ? ("serious" as const) : level === "medium" ? ("warning" as const) : ("good" as const),
  }));

  const actionsByStatus = (["open", "completed", "verified", "closed"] as const).map((status) => ({
    label: status,
    value: correctiveActions.filter((c) => c.status === status).length,
    tone:
      status === "open" ? ("warning" as const) : status === "completed" ? ("info" as const) : status === "verified" ? ("good" as const) : ("neutral" as const),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Safety & Compliance Dashboard</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Live rollup across all projects. Values update as inspections are submitted and reviewed.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Open Actions" value={openActions.length} tone="warning" icon={IconClipboardCheck} />
        <StatTile
          label="Overdue Actions"
          value={overdueActions.length}
          tone={overdueActions.length > 0 ? "critical" : "good"}
          icon={IconClock}
        />
        <StatTile
          label="Pending AI Reviews"
          value={pendingReviews.length}
          tone={pendingReviews.length > 0 ? "warning" : "good"}
          icon={IconEye}
        />
        <StatTile
          label="High/Critical Findings"
          value={highRiskFindings.length}
          tone={highRiskFindings.length > 0 ? "serious" : "good"}
          icon={IconAlertTriangle}
        />
        <StatTile
          label="Avg. Project Risk"
          value={avgRisk}
          tone={avgRisk > 50 ? "warning" : "good"}
          icon={IconGauge}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Findings by risk level" description="All findings, across all projects" />
          <BreakdownBars items={findingsByRisk} />
        </Card>
        <Card>
          <CardHeader title="Corrective actions by status" description="All actions, across all projects" />
          <BreakdownBars items={actionsByStatus} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Recent Inspections"
            description="Latest checklist submissions across all projects"
            action={
              <Link href="/projects" className="text-xs font-medium text-sidebar-accent">
                View projects
              </Link>
            }
          />
          {recentInspections.length === 0 ? (
            <p className="text-sm text-foreground/50">No inspections submitted yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentInspections.map((i) => {
                const project = getProject(i.projectId);
                const template = getTemplate(i.templateId);
                return (
                  <li key={i.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <Link href={`/inspections/${i.id}`} className="text-sm font-medium hover:underline">
                        {template?.name ?? "Inspection"}
                      </Link>
                      <p className="text-xs text-foreground/50">
                        {project?.name} · {i.date}
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
            title="Corrective Actions Due Soon"
            description="Sorted by nearest due date, open items first"
            action={
              <Link href="/corrective-actions" className="text-xs font-medium text-sidebar-accent">
                View all
              </Link>
            }
          />
          {upcomingActions.length === 0 ? (
            <p className="text-sm text-foreground/50">Nothing outstanding.</p>
          ) : (
            <ul className="divide-y divide-border">
              {upcomingActions.map((ca) => {
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

      <Card>
        <CardHeader title="Project Risk Overview" />
        <ul className="divide-y divide-border">
          {projects.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
              <div>
                <Link href={`/projects/${p.id}`} className="text-sm font-medium hover:underline">
                  {p.name}
                </Link>
                <p className="text-xs text-foreground/50">
                  {p.location} · {p.projectNumber}
                </p>
              </div>
              <RiskBadge level={riskLevelFromScore(p.riskScore)} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
