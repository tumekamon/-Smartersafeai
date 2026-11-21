import Link from "next/link";
import { nowMs } from "@/lib/time";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { getCompany } from "@/lib/db";
import { moduleVisible } from "@/lib/home-layout";
import { isOpenReport, myReports, type HazardStage, type MyHazardReport, type MyIncidentReport, type MyReport } from "@/lib/my-reports";
import { PRIORITY, taskTitle } from "@/lib/tasks";
import { shortDate, shortDateTime, timeAgo } from "@/lib/format";
import { EvidenceViewer } from "@/components/review/evidence-viewer";
import { IncidentTypeBadge } from "@/components/ui/badges";
import { IconAlertTriangle, IconArrowRight, IconCamera, IconCheck, IconMapPin, IconPlus } from "@/components/ui/icons";

type Tab = "all" | "open" | "closed";

const STAGE: Record<HazardStage, { label: string; badge: string; color: string }> = {
  sent: { label: "Waiting for review", badge: "badge-warning", color: "var(--status-warning)" },
  confirmed: { label: "Confirmed", badge: "badge-info", color: "var(--sidebar-accent)" },
  fixing: { label: "Being fixed", badge: "badge-info", color: "var(--sidebar-accent)" },
  fixed: { label: "Fixed", badge: "badge-good", color: "var(--status-good)" },
  not_taken: { label: "Reviewed, no fix needed", badge: "badge-neutral", color: "var(--border)" },
};

const INCIDENT_STAGE = {
  open: { label: "Reported", badge: "badge-warning", color: "var(--status-warning)" },
  investigating: { label: "Being looked into", badge: "badge-info", color: "var(--sidebar-accent)" },
  closed: { label: "Closed", badge: "badge-good", color: "var(--status-good)" },
} as const;

const name = (p?: { firstName: string; lastName: string }) => (p ? `${p.firstName} ${p.lastName.charAt(0)}.` : undefined);

/**
 * A worker's own reports and what happened to each: was it confirmed, who's fixing it,
 * is it fixed. Seeing a report go somewhere is what keeps people reporting.
 */
export default async function MyReportsPage({ searchParams }: { searchParams: Promise<{ tab?: string; sent?: string }> }) {
  const user = await getCurrentUser();
  if (getCapabilities(user).isReadOnly) redirect("/dashboard");
  const sp = await searchParams;
  const tab: Tab = sp.tab === "open" || sp.tab === "closed" ? sp.tab : "all";
  const now = nowMs();

  const all = myReports(user);
  const open = all.filter(isOpenReport);
  const shown = tab === "open" ? open : tab === "closed" ? all.filter((r) => !isOpenReport(r)) : all;
  const hazards = all.filter((r): r is MyHazardReport => r.kind === "hazard");
  const fixed = hazards.filter((r) => r.stage === "fixed").length;
  const sent = sp.sent ? all.find((r) => r.id === sp.sent) : undefined;

  const tabs: { id: Tab; label: string; n: number }[] = [
    { id: "all", label: "All", n: all.length },
    { id: "open", label: "In progress", n: open.length },
    { id: "closed", label: "Finished", n: all.length - open.length },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">What you reported</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">My reports</h1>
          {hazards.length > 0 && (
            <p className="mt-1 text-sm text-foreground/60">
              {fixed > 0 ? (
                <>
                  <span className="font-semibold text-status-good">{fixed} hazard{fixed === 1 ? "" : "s"} you reported {fixed === 1 ? "is" : "are"} fixed.</span> Thanks for speaking up.
                </>
              ) : (
                "Every report is reviewed by your safety team."
              )}
            </p>
          )}
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Link href="/hazards/new" className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-foreground px-4 text-[15px] font-bold text-background sm:flex-none">
            <IconPlus width={18} height={18} strokeWidth={2.4} /> Report hazard
          </Link>
          {moduleVisible(getCompany(user.companyId), user, "incidents") && <Link href="/incidents/new" className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-surface px-4 text-[15px] font-bold ring-1 ring-border sm:flex-none">
            Report incident
          </Link>}
        </div>
      </header>

      {sent && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-status-good/30 bg-status-good/10 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-status-good text-white">
            <IconCheck width={18} height={18} strokeWidth={2.6} />
          </span>
          <div>
            <p className="font-bold">Report sent</p>
            <p className="text-sm text-foreground/70">Your safety team will review it. You&apos;ll get a notification when it&apos;s confirmed and when it&apos;s fixed.</p>
          </div>
        </div>
      )}

      <nav aria-label="Report status" className="flex gap-1 rounded-2xl bg-surface-muted p-1">
        {tabs.map((t) => {
          const on = t.id === tab;
          return (
            <Link
              key={t.id}
              href={t.id === "all" ? "/my-reports" : `/my-reports?tab=${t.id}`}
              aria-current={on ? "page" : undefined}
              className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-2 text-sm font-bold transition-colors ${
                on ? "bg-surface shadow-sm ring-1 ring-border" : "text-foreground/55 hover:text-foreground"
              }`}
            >
              <span className="truncate">{t.label}</span>
              <span className={`rounded-full px-1.5 text-xs tabular-nums ${on ? "bg-foreground text-background" : "bg-foreground/10"}`}>{t.n}</span>
            </Link>
          );
        })}
      </nav>

      {shown.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-foreground/60">
            <IconCamera width={24} height={24} />
          </span>
          <p className="mt-1 font-bold">{all.length === 0 ? "You haven't reported anything yet" : "Nothing here"}</p>
          <p className="max-w-xs text-sm text-foreground/55">
            See something unsafe? Take a photo and report it. You&apos;ll be able to follow it here until it&apos;s fixed.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {shown.map((r) => (
            <li key={r.id} id={r.id}>
              {r.kind === "hazard" ? <HazardCard r={r} now={now} open={r.id === sp.sent} /> : <IncidentCard r={r} now={now} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CardShell({ color, open, summary, children }: { color: string; open?: boolean; summary: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface has-[details[open]]:shadow-lg has-[details[open]]:shadow-black/5">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 z-10 w-1.5" style={{ background: color }} />
      <details open={open} className="group">
      <summary className="flex cursor-pointer list-none items-start gap-3 p-4 pl-5 [&::-webkit-details-marker]:hidden">
        {summary}
        <IconArrowRight width={16} height={16} className="mt-1 shrink-0 text-foreground/40 transition-transform group-open:rotate-90" />
      </summary>
      <div className="border-t border-border px-4 pb-4 pl-5 pt-4">{children}</div>
      </details>
    </div>
  );
}

function Where({ r, now }: { r: MyReport; now: number }) {
  const loc = r.kind === "hazard" ? r.finding.location : r.incident.location;
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground/55">
      <span className="inline-flex items-center gap-1">
        <IconMapPin width={13} height={13} />
        {r.site.shortName} · {loc.level} {loc.zone}
      </span>
      <span>{timeAgo(Date.parse(r.at), now)}</span>
    </p>
  );
}

function HazardCard({ r, now, open }: { r: MyHazardReport; now: number; open: boolean }) {
  const s = STAGE[r.stage];
  const f = r.finding;
  const task = r.fix?.task;
  const steps: { done: boolean; title: string; text?: string; at?: string }[] = [
    { done: true, title: "You reported it", at: r.at },
    r.stage === "not_taken"
      ? { done: true, title: "Reviewed: no fix needed", text: name(r.reviewer) && `By ${name(r.reviewer)}`, at: f.reviewedAt }
      : { done: r.stage !== "sent", title: r.stage === "sent" ? "Safety review" : "Confirmed as a hazard", text: r.stage === "sent" ? "Usually within a few hours" : name(r.reviewer) && `By ${name(r.reviewer)}`, at: f.reviewedAt },
  ];
  if (r.stage !== "not_taken") {
    steps.push({
      done: !!task,
      title: "Fix assigned",
      text: task ? `To ${name(r.fix?.assignee) ?? "the crew"} · due ${shortDate(task.dueDate)}` : undefined,
      at: task?.createdAt,
    });
    steps.push({
      done: r.stage === "fixed",
      title: task?.status === "completed" ? "Marked fixed, being checked" : "Fixed and checked",
      at: task?.verifiedAt ?? task?.completedAt,
    });
  }

  return (
    <CardShell
      color={s.color}
      open={open}
      summary={
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold uppercase tracking-wider">
            <span className="text-foreground/50">Hazard</span>
            <span className="text-foreground/25">•</span>
            <span style={{ color: PRIORITY[f.riskLevel].color }}>{PRIORITY[f.riskLevel].label}</span>
            <span className="text-foreground/25">•</span>
            <span className="text-foreground/50">{f.hazardCategory}</span>
          </div>
          <div className="mt-1 flex items-start justify-between gap-3">
            <p className="text-[15px] font-semibold leading-snug sm:text-base">{f.title}</p>
            <span className={`badge ${s.badge} shrink-0`}>{s.label}</span>
          </div>
          <Where r={r} now={now} />
          {r.stage === "not_taken" && f.overrideReason && (
            <p className="mt-2.5 rounded-lg bg-surface-muted px-2.5 py-1.5 text-xs text-foreground/75">
              <span className="font-bold">{name(r.reviewer) ?? "Reviewer"}:</span> {f.overrideReason}
            </p>
          )}
        </div>
      }
    >
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Steps steps={steps} />
        <div className="space-y-3">
          {r.photo && <EvidenceViewer finding={f} evidence={r.photo} />}
          {f.aiExplanation && f.aiExplanation !== f.title && <p className="text-sm text-foreground/70">“{f.aiExplanation}”</p>}
          {task && (
            <p className="text-xs text-foreground/55">
              Fix: <span className="font-semibold text-foreground/80">{taskTitle(task)}</span>
            </p>
          )}
        </div>
      </div>
    </CardShell>
  );
}

function IncidentCard({ r, now }: { r: MyIncidentReport; now: number }) {
  const i = r.incident;
  const s = INCIDENT_STAGE[i.status];
  const steps = [
    { done: true, title: "You reported it", at: i.reportedAt },
    { done: i.status !== "open", title: "Looked into by safety" },
    { done: i.status === "closed", title: "Closed", at: i.closedAt },
  ];
  return (
    <CardShell
      color={s.color}
      summary={
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
            <span className="inline-flex items-center gap-1 text-foreground/50">
              <IconAlertTriangle width={12} height={12} /> Incident
            </span>
            <IncidentTypeBadge type={i.type} />
          </div>
          <div className="mt-1 flex items-start justify-between gap-3">
            <p className="line-clamp-2 text-[15px] font-semibold leading-snug sm:text-base">{i.description}</p>
            <span className={`badge ${s.badge} shrink-0`}>{s.label}</span>
          </div>
          <Where r={r} now={now} />
        </div>
      }
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Steps steps={steps} />
        {i.immediateAction && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-foreground/50">What was done right away</p>
            <p className="mt-1 text-sm text-foreground/75">{i.immediateAction}</p>
          </div>
        )}
      </div>
    </CardShell>
  );
}

function Steps({ steps }: { steps: { done: boolean; title: string; text?: string; at?: string }[] }) {
  return (
    <ol className="space-y-0">
      {steps.map((st, idx) => (
        <li key={idx} className="relative flex gap-3 pb-4 last:pb-0">
          {idx < steps.length - 1 && (
            <span aria-hidden="true" className={`absolute left-[11px] top-6 h-[calc(100%-1.25rem)] w-0.5 ${st.done && steps[idx + 1].done ? "bg-status-good" : "bg-border"}`} />
          )}
          <span
            className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${st.done ? "bg-status-good text-white" : "border-2 border-border bg-surface"}`}
          >
            {st.done && <IconCheck width={13} height={13} strokeWidth={3} />}
          </span>
          <span className="min-w-0">
            <span className={`block text-sm font-semibold ${st.done ? "" : "text-foreground/50"}`}>{st.title}</span>
            {(st.text || (st.done && st.at)) && (
              <span className="block text-xs text-foreground/55">{[st.text, st.done && st.at ? shortDateTime(st.at) : undefined].filter(Boolean).join(" · ")}</span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}
