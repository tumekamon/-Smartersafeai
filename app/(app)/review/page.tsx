import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { getInspection, getProject, getUser, listFindings } from "@/lib/db";
import { timeAgo } from "@/lib/format";
import type { Finding, RiskLevel } from "@/lib/types";
import { EvidenceViewer } from "@/components/review/evidence-viewer";
import { ReviewPanel } from "@/components/review/review-panel";
import { RiskBadge } from "@/components/ui/badges";
import { Avatar } from "@/components/ui/avatar";
import { IconCheck, IconMapPin, IconSparkle } from "@/components/ui/icons";
import { nowMs } from "@/lib/time";

const DAY = 86_400_000;
const rank: Record<RiskLevel, number> = { critical: 4, high: 3, medium: 2, low: 1 };
const dueDays: Record<RiskLevel, number> = { critical: 1, high: 3, medium: 7, low: 14 };
const stripe: Record<RiskLevel, string> = {
  critical: "var(--status-critical)",
  high: "var(--status-serious)",
  medium: "var(--status-warning)",
  low: "var(--status-good)",
};

function queueOrder(a: Finding, b: Finding) {
  return rank[b.riskLevel] - rank[a.riskLevel] || b.createdAt.localeCompare(a.createdAt);
}

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ finding?: string }>;
}) {
  const user = await getCurrentUser();
  const capabilities = getCapabilities(user.role);
  if (!capabilities.canReviewFindings) redirect("/dashboard");

  const { finding: selectedId } = await searchParams;
  const queue = listFindings(user.companyId).filter((f) => f.reviewerDecision === "pending").sort(queueOrder);
  const selected = queue.find((f) => f.id === selectedId) ?? queue[0];

  const recent = listFindings(user.companyId)
    .filter((f) => f.reviewerDecision !== "pending" && f.reviewedAt)
    .sort((a, b) => b.reviewedAt!.localeCompare(a.reviewedAt!))
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="ai-chip">
            <IconSparkle width={12} height={12} />
            AI review
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {queue.length === 0 ? "Queue is clear" : `${queue.length} finding${queue.length === 1 ? "" : "s"} to review`}
          </h1>
        </div>
      </div>

      {!selected ? (
        <section className="card flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "color-mix(in srgb, var(--status-good) 14%, var(--surface))", color: "var(--status-good)" }}>
            <IconCheck width={26} height={26} />
          </span>
          <h2 className="mt-4 text-lg font-semibold">Nothing waiting for review</h2>
          <p className="mt-1 max-w-sm text-sm text-foreground/55">New findings appear here automatically.</p>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <aside className="space-y-2">
            {queue.map((f) => {
              const active = f.id === selected.id;
              const project = getProject(f.projectId);
              return (
                <Link
                  key={f.id}
                  href={`/review?finding=${f.id}`}
                  className={`card relative block overflow-hidden p-3.5 pl-5 transition-all ${active ? "ring-2 ring-sidebar-accent" : "hover:shadow-md"}`}
                >
                  <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: stripe[f.riskLevel] }} />
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold leading-snug">{f.title}</p>
                    <RiskBadge level={f.riskLevel} />
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-xs text-foreground/55">
                    <IconMapPin width={12} height={12} />
                    {project?.shortName} · {f.location.level} {f.location.zone}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-foreground/45">
                    <span className="flex items-center gap-1.5">
                      <span className="h-1 w-14 rounded-full bg-surface-muted">
                        <span className="block h-1 rounded-full" style={{ width: `${f.aiConfidence * 100}%`, background: "var(--ai)" }} />
                      </span>
                      {Math.round(f.aiConfidence * 100)}% confidence
                    </span>
                    <span>{timeAgo(new Date(f.createdAt).getTime())}</span>
                  </div>
                </Link>
              );
            })}
          </aside>

          <ReviewWorkspace finding={selected} nextHref="/review" />
        </div>
      )}

      {recent.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold">Recently decided</h2>
          <ul className="divide-y divide-border">
            {recent.map((f) => {
              const reviewer = getUser(f.reviewerId ?? "");
              return (
                <li key={f.id} className="flex items-center gap-3 py-2.5">
                  {reviewer && <Avatar person={reviewer} size={26} />}
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="font-medium">{reviewer?.firstName}</span>{" "}
                    <span className="text-foreground/60">{f.reviewerDecision}</span>{" "}
                    <Link href={`/inspections/${f.inspectionId}`} className="font-medium hover:underline">{f.title}</Link>
                  </span>
                  <span className="text-xs text-foreground/40">{timeAgo(new Date(f.reviewedAt!).getTime())}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

async function ReviewWorkspace({ finding, nextHref }: { finding: Finding; nextHref: string }) {
  const inspection = getInspection(finding.inspectionId);
  const project = getProject(finding.projectId);
  const inspector = getUser(inspection?.inspectorId ?? "");
  const evidence = inspection?.evidence.find((e) => e.id === finding.evidenceId) ?? inspection?.evidence[0];
  const crew = (project?.crewIds ?? []).map((id) => getUser(id)).filter((u) => !!u);
  const due = new Date(nowMs() + dueDays[finding.riskLevel] * DAY).toISOString().slice(0, 10);
  const note = inspection?.responses.find((r) => r.note)?.note;

  return (
    <section className="card overflow-hidden">
      <div className="p-4 pb-0">
        <EvidenceViewer finding={finding} evidence={evidence} />
      </div>
      <div className="grid gap-6 p-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight">{finding.title}</h2>
            <RiskBadge level={finding.riskLevel} />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-foreground/55">
            <span>{project?.shortName}</span>
            <span>{finding.location.level} {finding.location.zone}</span>
            <span>{finding.regulatoryReference}</span>
          </p>

          <div className="mt-4 rounded-xl border border-ai/25 bg-ai-soft p-3.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-ai">
              <IconSparkle width={13} height={13} />
              What the AI saw
              <span className="ml-auto font-medium">{Math.round(finding.aiConfidence * 100)}% confidence</span>
            </p>
            <p className="mt-1.5 text-sm leading-relaxed">{finding.aiExplanation}</p>
          </div>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-foreground/50">Inspector</dt>
              <dd className="flex items-center gap-2 font-medium">
                {inspector && <Avatar person={inspector} size={20} />}
                {inspector?.firstName} {inspector?.lastName}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-foreground/50">Submitted</dt>
              <dd className="font-medium">{inspection ? timeAgo(new Date(inspection.submittedAt).getTime()) : ""}</dd>
            </div>
            {note && (
              <div className="flex justify-between gap-4">
                <dt className="text-foreground/50">Inspector note</dt>
                <dd className="max-w-[16rem] text-right font-medium">{note}</dd>
              </div>
            )}
          </dl>
        </div>

        <div>
          <ReviewPanel
            finding={finding}
            assignees={crew as NonNullable<(typeof crew)[number]>[]}
            canAssign
            defaultDue={due}
            defaultDescription={`${finding.title} — ${project?.shortName}, ${finding.location.level} ${finding.location.zone}`}
            next={nextHref}
          />
        </div>
      </div>
    </section>
  );
}
