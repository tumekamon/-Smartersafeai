import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import {
  getCorrectiveAction,
  getInspection,
  getProject,
  getTemplate,
  getUser,
  listFindingsForInspection,
} from "@/lib/db";
import { passRate } from "@/lib/metrics";
import { shortDateTime } from "@/lib/format";
import type { RiskLevel } from "@/lib/types";
import { EvidenceViewer } from "@/components/review/evidence-viewer";
import { ReviewPanel } from "@/components/review/review-panel";
import { CreateCorrectiveActionForm } from "@/components/create-corrective-action-form";
import { ScoreRing } from "@/components/viz/score-ring";
import { Avatar } from "@/components/ui/avatar";
import { CorrectiveActionStatusBadge, DecisionBadge, InspectionStatusBadge, RiskBadge } from "@/components/ui/badges";
import { IconCheck, IconMapPin, IconSparkle, IconX } from "@/components/ui/icons";
import { nowMs } from "@/lib/time";

const DAY = 86_400_000;
const dueDays: Record<RiskLevel, number> = { critical: 1, high: 3, medium: 7, low: 14 };

export default async function InspectionDetailPage({
  params,
}: {
  params: Promise<{ inspectionId: string }>;
}) {
  const { inspectionId } = await params;
  const inspection = getInspection(inspectionId);
  if (!inspection) notFound();

  const user = await getCurrentUser();
  const caps = getCapabilities(user.role);

  const project = getProject(inspection.projectId);
  const template = getTemplate(inspection.templateId);
  const inspector = getUser(inspection.inspectorId);
  const findings = listFindingsForInspection(inspectionId);
  const crew = (project?.crewIds ?? []).map((id) => getUser(id)).filter((u): u is NonNullable<typeof u> => !!u);
  const rate = passRate(inspection);
  const rateLevel: RiskLevel = rate >= 95 ? "low" : rate >= 85 ? "medium" : rate >= 70 ? "high" : "critical";
  const failed = inspection.responses.filter((r) => r.value === "fail").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/projects/${inspection.projectId}`} className="text-xs font-medium text-sidebar-accent">
            ← {project?.shortName}
          </Link>
          <h1 className="mt-1.5 text-3xl font-semibold tracking-tight">
            {template?.name}
            {inspection.assetTag && (
              <span className="ml-3 rounded-lg bg-surface-muted px-2 py-1 align-middle text-sm font-medium text-foreground/60">
                {inspection.assetTag}
              </span>
            )}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground/60">
            <span className="flex items-center gap-1.5">
              <IconMapPin width={14} height={14} />
              {project?.shortName} · {inspection.location.level} {inspection.location.zone}
            </span>
            <span className="flex items-center gap-1.5">
              {inspector && <Avatar person={inspector} size={20} />}
              {inspector?.firstName} {inspector?.lastName}
            </span>
            <span>{shortDateTime(inspection.submittedAt)}</span>
          </p>
        </div>
        <InspectionStatusBadge status={inspection.status} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          {findings.length === 0 ? (
            <section className="card flex flex-col items-center px-6 py-14 text-center">
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: "color-mix(in srgb, var(--status-good) 14%, var(--surface))", color: "var(--status-good)" }}
              >
                <IconCheck width={26} height={26} />
              </span>
              <h2 className="mt-4 text-lg font-semibold">
                {failed === 0 ? "Clean inspection" : "Failed items recorded"}
              </h2>
              <p className="mt-1 max-w-sm text-sm text-foreground/55">
                {failed === 0
                  ? "Every checklist item passed. No hazards were flagged."
                  : `${failed} item${failed === 1 ? "" : "s"} failed. Corrective actions were raised directly for this equipment check.`}
              </p>
            </section>
          ) : (
            findings.map((finding) => {
              const evidence = inspection.evidence.find((e) => e.id === finding.evidenceId) ?? inspection.evidence[0];
              const action = finding.correctiveActionId ? getCorrectiveAction(finding.correctiveActionId) : undefined;
              const reviewer = getUser(finding.reviewerId ?? "");
              const owner = action ? getUser(action.assignedToId) : undefined;
              const due = new Date(nowMs() + dueDays[finding.riskLevel] * DAY).toISOString().slice(0, 10);
              return (
                <section key={finding.id} className="card overflow-hidden">
                  <div className="p-4 pb-0">
                    <EvidenceViewer finding={finding} evidence={evidence} />
                  </div>
                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold tracking-tight">{finding.title}</h2>
                      <RiskBadge level={finding.riskLevel} />
                      <DecisionBadge decision={finding.reviewerDecision} />
                      <span className="ml-auto text-xs text-foreground/45">{finding.regulatoryReference}</span>
                    </div>

                    <div className="mt-3 rounded-xl border border-ai/25 bg-ai-soft p-3.5">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-ai">
                        <IconSparkle width={13} height={13} />
                        What the AI saw
                        <span className="ml-auto font-medium">{Math.round(finding.aiConfidence * 100)}% confidence</span>
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed">{finding.aiExplanation}</p>
                    </div>

                    {finding.reviewerDecision === "pending" ? (
                      caps.canReviewFindings ? (
                        <div className="mt-5 border-t border-border pt-5">
                          <p className="eyebrow mb-3">Your decision</p>
                          <ReviewPanel
                            finding={finding}
                            assignees={crew}
                            canAssign={caps.canCreateCorrectiveActions}
                            defaultDue={due}
                            defaultDescription={`${finding.title} — ${project?.shortName}, ${finding.location.level} ${finding.location.zone}`}
                            next={`/inspections/${inspection.id}`}
                          />
                        </div>
                      ) : (
                        <p className="mt-4 rounded-lg bg-surface-muted px-3 py-2 text-xs text-foreground/55">
                          Waiting for a safety professional to review this finding.
                        </p>
                      )
                    ) : (
                      <div className="mt-4 space-y-3 border-t border-border pt-4 text-sm">
                        {reviewer && (
                          <p className="flex items-center gap-2 text-foreground/70">
                            <Avatar person={reviewer} size={22} />
                            <span>
                              <span className="font-medium text-foreground">{reviewer.firstName} {reviewer.lastName}</span>{" "}
                              {finding.reviewerDecision}
                              {finding.reviewedAt ? ` · ${shortDateTime(finding.reviewedAt)}` : ""}
                            </span>
                          </p>
                        )}
                        {finding.overrideReason && (
                          <p className="text-xs text-foreground/55">Reason: {finding.overrideReason}</p>
                        )}
                        {action ? (
                          <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-muted p-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{action.description.split(" — ")[0]}</p>
                              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-foreground/50">
                                {owner && <Avatar person={owner} size={16} />}
                                {owner?.firstName} {owner?.lastName} · due {action.dueDate}
                              </p>
                            </div>
                            <CorrectiveActionStatusBadge status={action.status} />
                          </div>
                        ) : (
                          finding.reviewerDecision !== "rejected" &&
                          caps.canCreateCorrectiveActions && (
                            <CreateCorrectiveActionForm
                              projectId={inspection.projectId}
                              findingId={finding.id}
                              defaultDescription={`${finding.title} — ${project?.shortName}, ${finding.location.level} ${finding.location.zone}`}
                              users={crew}
                            />
                          )
                        )}
                      </div>
                    )}
                  </div>
                </section>
              );
            })
          )}
        </div>

        <aside className="space-y-5">
          <section className="card p-5">
            <div className="flex items-center gap-4">
              <ScoreRing score={rate} level={rateLevel} size={92} stroke={9} />
              <div>
                <p className="eyebrow">Pass rate</p>
                <p className="mt-1 text-sm text-foreground/60">
                  {inspection.responses.filter((r) => r.value === "pass").length} of{" "}
                  {inspection.responses.filter((r) => r.value !== "na").length} items passed
                </p>
              </div>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="eyebrow mb-3">Checklist</h2>
            <ul className="space-y-3">
              {inspection.responses.map((r) => {
                const item = template?.checklist.find((c) => c.id === r.itemId);
                const fail = r.value === "fail";
                return (
                  <li key={r.itemId} className="flex items-start gap-3">
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                      style={{
                        background: fail
                          ? "color-mix(in srgb, var(--status-critical) 15%, var(--surface))"
                          : r.value === "pass"
                            ? "color-mix(in srgb, var(--status-good) 15%, var(--surface))"
                            : "var(--surface-muted)",
                        color: fail ? "var(--status-critical)" : r.value === "pass" ? "var(--status-good)" : "var(--status-neutral)",
                      }}
                    >
                      {fail ? <IconX width={12} height={12} /> : r.value === "pass" ? <IconCheck width={12} height={12} /> : <span className="text-[9px] font-bold">–</span>}
                    </span>
                    <span className="min-w-0 text-sm">
                      <span className={fail ? "font-medium" : "text-foreground/75"}>{item?.label}</span>
                      {r.note && <span className="mt-0.5 block text-xs text-foreground/45">{r.note}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
