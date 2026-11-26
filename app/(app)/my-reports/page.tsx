import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { redirect } from "next/navigation";
import { nowMs } from "@/lib/time";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { getCompany } from "@/lib/db";
import { moduleVisible } from "@/lib/home-layout";
import { isOpenReport, myReports, type HazardStage, type MyReport } from "@/lib/my-reports";
import { PRIORITY } from "@/lib/tasks";
import { shortDate } from "@/lib/format";
import { EvidenceViewer } from "@/components/review/evidence-viewer";
import { PriorityTag } from "@/components/tasks/task-list";
import { IconAlertTriangle, IconCamera, IconCheck, IconChevronLeft, IconClock, IconFileText, IconMapPin, IconPlus, IconWrench } from "@/components/ui/icons";

type Tab = "all" | "open" | "closed";

const STAGE: Record<HazardStage, { label: string; tag: string }> = {
  sent: { label: "In review", tag: "ds-tag-info" },
  confirmed: { label: "Confirmed", tag: "ds-tag-info" },
  fixing: { label: "Being fixed", tag: "ds-tag-warn" },
  fixed: { label: "Fixed", tag: "ds-tag-good" },
  not_taken: { label: "No fix needed", tag: "ds-tag-neutral" },
};
const INCIDENT_STAGE = {
  open: { label: "Reported", tag: "ds-tag-info" },
  investigating: { label: "Investigating", tag: "ds-tag-warn" },
  closed: { label: "Closed", tag: "ds-tag-good" },
} as const;
const INCIDENT_TYPE: Record<string, string> = {
  near_miss: "Near miss",
  first_aid: "First aid",
  recordable: "Injury",
  property_damage: "Property damage",
  illness: "Illness",
};

const name = (p?: { firstName: string; lastName: string }) => (p ? `${p.firstName} ${p.lastName}` : undefined);
const titleOf = (r: MyReport) => (r.kind === "hazard" ? r.finding.title : r.incident.description);
const stageOf = (r: MyReport) => (r.kind === "hazard" ? STAGE[r.stage] : INCIDENT_STAGE[r.incident.status]);
const whereOf = (r: MyReport) => {
  const l = r.kind === "hazard" ? r.finding.location : r.incident.location;
  return `${l.level} · ${l.zone}`;
};

/** "Today 08:40", "Yesterday", "Fri 20 Nov". */
function when(iso: string, now: number) {
  const d = new Date(iso);
  const days = Math.floor((new Date(now).setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 86_400_000);
  if (days === 0) return `Today ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

type Step = { done: boolean; title: string; text?: string };

/** Where one report has got to, as timeline steps. */
function stepsOf(r: MyReport): Step[] {
  if (r.kind === "incident") {
    const i = r.incident;
    return [
      { done: true, title: "You reported it", text: shortDate(i.reportedAt) },
      { done: i.status !== "open", title: "Looked into by safety" },
      { done: i.status === "closed", title: "Closed", text: i.closedAt ? shortDate(i.closedAt) : undefined },
    ];
  }
  const f = r.finding;
  const task = r.fix?.task;
  const sent = { done: true, title: "You reported it", text: shortDate(r.at) };
  if (r.stage === "not_taken") return [sent, { done: true, title: `Reviewed by ${name(r.reviewer) ?? "safety"}`, text: "No fix needed" }];
  return [
    sent,
    r.stage === "sent"
      ? { done: false, title: "Safety review", text: "Usually within a few hours" }
      : { done: true, title: `Confirmed${r.reviewer ? ` by ${name(r.reviewer)}` : ""}`, text: `Severity ${PRIORITY[f.riskLevel].label}` },
    {
      done: !!task,
      title: task ? `Fix given to ${r.fix?.assignee?.firstName ?? "the crew"}` : "Fix assigned",
      text: task ? `Due ${shortDate(task.dueAt ?? `${task.dueDate}T12:00:00`)}` : undefined,
    },
    { done: r.stage === "fixed", title: task?.status === "completed" ? "Fixed, being checked" : "Fixed and checked" },
  ];
}

/**
 * What happened to what the worker reported, as a CRM-style list and detail: summary
 * cards, then the reports on the left and the chosen one on the right (its photo, where
 * it has got to, and what safety said). On phones the detail opens above the list.
 */
export default async function MyReportsPage({ searchParams }: { searchParams: Promise<{ tab?: string; r?: string; sent?: string }> }) {
  const user = await getCurrentUser();
  if (getCapabilities(user).isReadOnly) redirect("/dashboard");
  const sp = await searchParams;
  const now = nowMs();
  const tab: Tab = sp.tab === "open" || sp.tab === "closed" ? sp.tab : "all";
  const incidentsOn = moduleVisible(getCompany(user.companyId), user, "incidents");

  const all = myReports(user);
  const open = all.filter(isOpenReport);
  const finished = all.filter((r) => !isOpenReport(r));
  const shown = tab === "open" ? open : tab === "closed" ? finished : all;
  const fixed = all.filter((r) => (r.kind === "hazard" ? r.stage === "fixed" : r.incident.status === "closed")).length;
  const inReview = all.filter((r) => r.kind === "hazard" && r.stage === "sent").length;

  // The detail follows the report tapped or just sent; on large screens it defaults to the first one.
  const picked = sp.r ?? sp.sent;
  const focus = all.find((r) => r.id === picked) ?? shown[0];
  const explicit = !!picked && focus?.id === picked;
  const q = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { tab: tab === "all" ? undefined : tab, r: focus?.id, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/my-reports?${s}` : "/my-reports";
  };

  const tabs: { id: Tab; label: string; n: number }[] = [
    { id: "all", label: "All", n: all.length },
    { id: "open", label: "In progress", n: open.length },
    { id: "closed", label: "Finished", n: finished.length },
  ];

  return (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-5 sm:gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <span className="eyebrow">What happened to what you reported</span>
          <h1 className="disp text-[32px] leading-tight sm:text-[36px]">My reports</h1>
          <p className="text-[15px] text-body">
            {fixed > 0 ? `${fixed} of your reports ${fixed === 1 ? "has" : "have"} been fixed or closed. Thanks for speaking up.` : "Every report is reviewed by your safety team."}
          </p>
        </div>
        <div className="flex gap-2">
          {incidentsOn && (
            <Link href="/incidents/new" className="ds-btn ds-btn-outline min-h-11 flex-1 px-4 text-[15px] sm:flex-none">
              Report incident
            </Link>
          )}
          <Link href="/hazards/new" className="ds-btn ds-btn-yellow min-h-11 flex-1 px-4 text-[15px] sm:flex-none">
            <IconPlus width={17} height={17} strokeWidth={2.4} /> Report hazard
          </Link>
        </div>
      </header>

      {sp.sent && (
        <p role="status" className="wk-card flex items-center gap-3 p-4 text-[15px]">
          <span className="wk-icon" style={{ color: "var(--status-good)", background: "color-mix(in srgb, var(--status-good) 13%, var(--surface))" }}>
            <IconCheck width={18} height={18} strokeWidth={2.4} />
          </span>
          <span>
            <span className="font-semibold">Report sent.</span> <span className="text-body">You&apos;ll be notified when it&apos;s confirmed and when it&apos;s fixed.</span>
          </span>
        </p>
      )}

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <Summary label="Reported" value={all.length} Icon={IconCamera} />
        <Summary label="In review" value={inReview} Icon={IconClock} />
        <Summary label="In progress" value={open.length} Icon={IconWrench} tone={open.length ? "var(--status-warning)" : undefined} />
        <Summary label="Fixed or closed" value={fixed} Icon={IconCheck} tone={fixed ? "var(--status-good)" : undefined} />
      </section>

      {all.length === 0 ? (
        <div className="wk-card flex flex-col items-center gap-2 px-6 py-14 text-center">
          <span className="wk-icon">
            <IconCamera width={20} height={20} />
          </span>
          <p className="mt-1 font-semibold">You haven&apos;t reported anything yet</p>
          <p className="max-w-sm text-sm text-body">See something unsafe? Tap Report, take a photo, and follow it here until it&apos;s fixed.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start">
          {/* Detail first in the DOM so it shows above the list on phones once a report is tapped. */}
          {focus && (
            <div id="report" className={`${explicit ? "" : "hidden lg:block"} min-w-0 scroll-mt-4 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1`}>
              <Detail report={focus} now={now} closeHref={q({ r: undefined })} userId={user.id} />
            </div>
          )}

          <section className="wk-card min-w-0 overflow-hidden lg:col-start-1 lg:row-start-1">
            <nav aria-label="Report status" className="flex gap-1 overflow-x-auto border-b border-border px-2 sm:px-3">
              {tabs.map((t) => {
                const on = t.id === tab;
                return (
                  <Link
                    key={t.id}
                    href={t.id === "all" ? "/my-reports" : `/my-reports?tab=${t.id}`}
                    aria-current={on ? "page" : undefined}
                    className={`relative flex min-h-12 shrink-0 items-center gap-2 px-3 text-sm font-semibold transition-colors ${on ? "text-foreground" : "text-body hover:text-foreground"}`}
                  >
                    {t.label}
                    <span className={`rounded-full px-2 text-xs leading-5 tabular-nums ${on ? "bg-brand text-surface" : "bg-surface-muted text-body"}`}>{t.n}</span>
                    {on && <span aria-hidden="true" className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand" />}
                  </Link>
                );
              })}
            </nav>

            {shown.length === 0 ? (
              <p className="px-6 py-12 text-center text-sm text-body">Nothing here.</p>
            ) : (
              <ul className="divide-y divide-border">
                {shown.map((r) => (
                  <li key={r.id}>
                    <Row report={r} now={now} selected={r.id === focus?.id} explicit={explicit} href={`${q({ r: r.id })}#report`} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Summary({ label, value, Icon, tone }: { label: string; value: number; Icon: ComponentType<SVGProps<SVGSVGElement>>; tone?: string }) {
  return (
    <div className="wk-card flex min-w-0 items-center gap-3 p-3.5 sm:p-4">
      <span className="wk-icon" style={tone ? { color: tone, background: `color-mix(in srgb, ${tone} 13%, var(--surface))` } : undefined}>
        <Icon width={18} height={18} strokeWidth={2} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="disp text-[26px] leading-none tabular-nums" style={tone && value ? { color: tone } : undefined}>
          {value}
        </span>
        <span className="truncate text-[13px] text-body">{label}</span>
      </span>
    </div>
  );
}

function KindIcon({ report: r }: { report: MyReport }) {
  const color = r.kind === "hazard" ? (r.finding.riskLevel === "critical" || r.finding.riskLevel === "high" ? "var(--status-critical)" : r.finding.riskLevel === "medium" ? "var(--status-warning)" : "var(--brand)") : "var(--status-neutral)";
  const Icon = r.kind === "hazard" ? IconAlertTriangle : IconFileText;
  return (
    <span className="wk-icon h-10 w-10" style={{ color, background: `color-mix(in srgb, ${color} 13%, var(--surface))` }}>
      <Icon width={18} height={18} strokeWidth={2} />
    </span>
  );
}

function Row({ report: r, now, selected, explicit, href }: { report: MyReport; now: number; selected: boolean; explicit: boolean; href: string }) {
  const s = stageOf(r);
  return (
    <Link
      href={href}
      aria-current={selected ? "true" : undefined}
      className={`group relative flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-surface-muted/70 sm:px-5 ${
        selected ? (explicit ? "bg-surface-muted" : "lg:bg-surface-muted") : ""
      }`}
    >
      {/* Same marker as the sidebar's active page: a short hi-vis bar, not a full-height stripe. */}
      {selected && <span aria-hidden="true" className={`absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-hivis ${explicit ? "" : "hidden lg:block"}`} />}
      <KindIcon report={r} />
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="line-clamp-2 text-[15px] font-semibold leading-snug group-hover:text-brand">{titleOf(r)}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-body">
          {r.kind === "hazard" ? (
            <>
              <PriorityTag level={r.finding.riskLevel} />
              <span>{r.finding.hazardCategory}</span>
            </>
          ) : (
            <span className="ds-tag ds-tag-neutral">{INCIDENT_TYPE[r.incident.type] ?? "Incident"}</span>
          )}
          <span className="inline-flex items-center gap-1">
            <IconMapPin width={12} height={12} />
            {whereOf(r)}
          </span>
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1 text-right">
        <span className={`ds-tag ${s.tag}`}>{s.label}</span>
        <span className="whitespace-nowrap text-[12px] text-body">{when(r.at, now)}</span>
      </span>
    </Link>
  );
}

function Detail({ report: r, now, closeHref, userId }: { report: MyReport; now: number; closeHref: string; userId: string }) {
  const s = stageOf(r);
  const steps = stepsOf(r);
  const task = r.kind === "hazard" ? r.fix?.task : undefined;
  return (
    <article className="wk-card flex flex-col gap-4 p-4 sm:p-5">
      <Link href={closeHref} scroll={false} className="ds-back -mt-2 self-start lg:hidden">
        <IconChevronLeft width={18} height={18} /> All reports
      </Link>
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="eyebrow">{r.kind === "hazard" ? `Hazard · ${r.finding.hazardCategory}` : `Incident · ${INCIDENT_TYPE[r.incident.type] ?? ""}`}</span>
          <span className={`ds-tag ${s.tag}`}>{s.label}</span>
        </div>
        <h2 className="text-lg font-semibold leading-snug">{titleOf(r)}</h2>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-body">
          <span className="inline-flex items-center gap-1">
            <IconMapPin width={13} height={13} />
            {r.site.shortName} · {whereOf(r)}
          </span>
          <span>{when(r.at, now)}</span>
          {r.kind === "hazard" && <PriorityTag level={r.finding.riskLevel} />}
        </p>
      </header>

      {r.kind === "hazard" && r.photo && <EvidenceViewer finding={r.finding} evidence={r.photo} />}

      {r.kind === "hazard" && r.stage === "not_taken" && r.finding.overrideReason && (
        <div className="ds-note">
          <span className="eyebrow" style={{ color: "var(--brand)" }}>
            {name(r.reviewer) ?? "Safety"} said
          </span>
          <span className="text-[15px] leading-relaxed">&ldquo;{r.finding.overrideReason}&rdquo;</span>
        </div>
      )}
      {r.kind === "hazard" && r.finding.aiExplanation && r.finding.aiExplanation !== r.finding.title && r.stage !== "not_taken" && (
        <p className="text-[15px] leading-relaxed text-body">{r.finding.aiExplanation}</p>
      )}
      {r.kind === "incident" && r.incident.immediateAction && (
        <div className="rounded-xl bg-surface-muted px-3.5 py-3">
          <p className="eyebrow">Done right away</p>
          <p className="mt-1 text-[15px]">{r.incident.immediateAction}</p>
        </div>
      )}

      <section aria-label="Progress">
        <p className="eyebrow mb-2.5">Progress</p>
        <ol className="flex flex-col">
          {steps.map((st, i) => (
            <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
              {i < steps.length - 1 && (
                <span aria-hidden="true" className={`absolute left-[11px] top-6 h-[calc(100%-1.25rem)] w-0.5 ${st.done && steps[i + 1].done ? "bg-brand" : "bg-border"}`} />
              )}
              <span className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${st.done ? "bg-brand text-surface" : "border-2 border-border bg-surface"}`}>
                {st.done && <IconCheck width={13} height={13} strokeWidth={3} />}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className={`text-sm font-medium ${st.done ? "" : "text-muted"}`}>
                  <span className="sr-only">{st.done ? "Done: " : "Next: "}</span>
                  {st.title}
                </span>
                {st.text && <span className="text-[13px] text-body">{st.text}</span>}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* Only the person fixing it can open the task. */}
      {task && task.assignedToId === userId && (
        <Link href={`/corrective-actions/${task.id}`} className="ds-btn ds-btn-outline min-h-11 text-[15px]">
          Open your fix
        </Link>
      )}
    </article>
  );
}
