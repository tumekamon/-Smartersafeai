import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import {
  getInspection,
  getProject,
  getTemplate,
  getUser,
  listFindingsForInspection,
  listUsers,
} from "@/lib/db";
import { Card, CardHeader } from "@/components/ui/card";
import { InspectionStatusBadge } from "@/components/ui/badges";
import { FindingReview } from "@/components/finding-review";
import { CreateCorrectiveActionForm } from "@/components/create-corrective-action-form";

export default async function InspectionDetailPage({
  params,
}: {
  params: Promise<{ inspectionId: string }>;
}) {
  const { inspectionId } = await params;
  const inspection = getInspection(inspectionId);
  if (!inspection) notFound();

  const user = await getCurrentUser();
  const capabilities = getCapabilities(user.role);

  const project = getProject(inspection.projectId);
  const template = getTemplate(inspection.templateId);
  const inspector = getUser(inspection.inspectorId);
  const findings = listFindingsForInspection(inspectionId);
  const users = listUsers();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={`/projects/${inspection.projectId}`}
            className="text-xs font-medium text-sidebar-accent"
          >
            ← {project?.name}
          </Link>
          <h1 className="mt-1 text-xl font-semibold">{template?.name}</h1>
          <p className="mt-1 text-sm text-foreground/60">
            {inspection.date} · Inspector: {inspector?.firstName} {inspector?.lastName}
          </p>
        </div>
        <InspectionStatusBadge status={inspection.status} />
      </div>

      <Card>
        <CardHeader title="Checklist responses" />
        <ul className="divide-y divide-border">
          {inspection.responses.map((r) => {
            const item = template?.checklist.find((c) => c.id === r.itemId);
            return (
              <li key={r.itemId} className="flex items-start justify-between gap-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">{item?.label}</p>
                  {r.note && <p className="text-xs text-foreground/50">{r.note}</p>}
                </div>
                <span
                  className={`badge shrink-0 capitalize ${
                    r.value === "fail"
                      ? "badge-critical"
                      : r.value === "pass"
                        ? "badge-good"
                        : "badge-neutral"
                  }`}
                >
                  {r.value}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      {inspection.evidence.length > 0 && (
        <Card>
          <CardHeader title="Evidence" description={`${inspection.evidence.length} file(s) attached`} />
          <ul className="flex flex-wrap gap-2">
            {inspection.evidence.map((ev) => (
              <li
                key={ev.id}
                className="rounded-md border border-border bg-surface-muted px-3 py-1.5 text-xs"
              >
                {ev.fileName}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader
          title="AI Findings & Human Review"
          description={
            findings.length === 0
              ? "No hazards flagged for this inspection"
              : "AI never makes the final call — a qualified reviewer approves, overrides, or rejects each finding"
          }
        />
        {findings.length === 0 ? (
          <p className="text-sm text-foreground/50">Nothing flagged.</p>
        ) : (
          <div className="space-y-4">
            {findings.map((finding) => (
              <div key={finding.id}>
                <FindingReview finding={finding} canReview={capabilities.canReviewFindings} />
                {finding.reviewerDecision !== "pending" &&
                  finding.reviewerDecision !== "rejected" &&
                  !finding.correctiveActionId &&
                  capabilities.canCreateCorrectiveActions && (
                    <CreateCorrectiveActionForm
                      projectId={inspection.projectId}
                      findingId={finding.id}
                      defaultDescription={`Address: ${finding.hazardCategory}`}
                      users={users}
                    />
                  )}
                {finding.correctiveActionId && (
                  <p className="mt-2 text-xs text-foreground/50">
                    Corrective action created —{" "}
                    <Link href="/corrective-actions" className="text-sidebar-accent">
                      view in tracker
                    </Link>
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
