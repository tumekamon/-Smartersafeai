import Link from "next/link";
import { nowMs } from "@/lib/time";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { isOpenReport, myReports, type HazardStage, type MyReport } from "@/lib/my-reports";
import { PRIORITY } from "@/lib/tasks";
import { shortDate } from "@/lib/format";

const STAGE: Record<HazardStage, { label: string; tag: string }> = {
  sent: { label: "In review", tag: "ds-tag-info" },
  confirmed: { label: "Confirmed", tag: "ds-tag-info" },
  fixing: { label: "Being fixed", tag: "ds-tag-warn" },
  fixed: { label: "Fixed", tag: "ds-tag-good" },
  not_taken: { label: "No fix needed", tag: "ds-tag-neutral" },
};

const INCIDENT_STAGE = {
  open: { label: "Reported", tag: "ds-tag-info" },
  investigating: { label: "Investigating", tag: "ds-tag-neutral" },
  closed: { label: "Closed", tag: "ds-tag-good" },
} as const;

const name = (p?: { firstName: string; lastName: string }) => (p ? `${p.firstName} ${p.lastName}` : undefined);

/** "Today 08:40", "Fri 20 Nov". */
function when(iso: string, now: number) {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date(now).toDateString();
  return sameDay
    ? `Today ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

const titleOf = (r: MyReport) => (r.kind === "hazard" ? r.finding.title : `${r.incident.type === "near_miss" ? "Near miss" : "Incident"}: ${r.incident.description}`);
const stageOf = (r: MyReport) => (r.kind === "hazard" ? STAGE[r.stage] : INCIDENT_STAGE[r.incident.status]);

type Step = { done: boolean; title: string; text?: string };

/** Where one report has got to, as the design's pip steps. */
function stepsOf(r: MyReport): Step[] {
  if (r.kind === "incident") {
    const i = r.incident;
    return [
      { done: true, title: "Sent", text: `${i.location.level} ${i.location.zone}` },
      { done: i.status !== "open", title: "Looked into by safety" },
      { done: i.status === "closed", title: "Closed" },
    ];
  }
  const f = r.finding;
  const task = r.fix?.task;
  const sent = { done: true, title: "Sent", text: `${f.hazardCategory} · ${PRIORITY[f.riskLevel].label} · ${f.location.level} ${f.location.zone}` };
  if (r.stage === "not_taken") {
    return [sent, { done: true, title: `Reviewed by ${name(r.reviewer) ?? "safety"}`, text: f.overrideReason ?? "No fix needed" }];
  }
  return [
    sent,
    r.stage === "sent"
      ? { done: false, title: "Safety review", text: "Usually within a few hours" }
      : { done: true, title: `Confirmed${r.reviewer ? ` by ${name(r.reviewer)}` : ""}`, text: `Severity ${PRIORITY[f.riskLevel].label}` },
    {
      done: !!task,
      title: task ? `Fix assigned to ${r.fix?.assignee?.firstName ?? "the crew"}` : "Fix assigned",
      text: task ? `Due ${shortDate(task.dueAt ?? `${task.dueDate}T12:00:00`)}` : undefined,
    },
    { done: r.stage === "fixed", title: task?.status === "completed" ? "Fixed, being checked" : "Fixed and verified" },
    { done: task?.status === "closed", title: "Closed" },
  ];
}

/**
 * What happened to what the worker reported (design canvas W08): the chosen report's
 * steps in a card, everything else as rows with a status tag. Seeing a report go
 * somewhere is what keeps people reporting.
 */
export default async function MyReportsPage({ searchParams }: { searchParams: Promise<{ r?: string; sent?: string }> }) {
  const user = await getCurrentUser();
  if (getCapabilities(user).isReadOnly) redirect("/dashboard");
  const sp = await searchParams;
  const now = nowMs();

  const all = myReports(user);
  // The card follows the report just sent or tapped, else the newest one still moving.
  const pick = sp.r ?? sp.sent;
  const focus = all.find((r) => r.id === pick) ?? all.find(isOpenReport) ?? all[0];
  const rest = all.filter((r) => r !== focus);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-[22px] pt-3 lg:pt-0">
      <header className="flex flex-col gap-3">
        <span className="eyebrow">What happened to what you reported</span>
        <h1 className="disp text-[40px] leading-none">My reports</h1>
      </header>

      {all.length === 0 ? (
        <p className="border-t-2 border-brand py-5 text-[15px] leading-relaxed text-body">
          Nothing yet. See something unsafe? Tap Report, take a photo, and follow it here until it&apos;s fixed.
        </p>
      ) : (
        <>
          {focus && (
            <section aria-label="Selected report" className="flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-[18px]">
              {sp.sent === focus.id && (
                <span className="ds-tag ds-tag-good self-start">Sent · thanks for speaking up</span>
              )}
              <div className="flex items-start justify-between gap-3">
                <span className="line-clamp-2 text-[17px] font-semibold leading-snug">{titleOf(focus)}</span>
                <span className="eyebrow shrink-0 pt-1">{when(focus.at, now)}</span>
              </div>
              <ol className="flex flex-col gap-2.5">
                {stepsOf(focus).map((s, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className={`mt-1 h-3 w-3 shrink-0 rounded-full ${s.done ? "bg-brand" : "border-2 border-foreground/20 bg-surface"}`}
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className={`text-[15px] ${s.done ? "font-medium" : "text-muted"}`}>
                        <span className="sr-only">{s.done ? "Done: " : "Next: "}</span>
                        {s.title}
                      </span>
                      {s.text && s.done && <span className="text-[13px] text-body">{s.text}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {rest.length > 0 && (
            <div className="flex flex-col border-t-2 border-brand">
              {rest.map((r) => {
                const s = stageOf(r);
                return (
                  <Link key={r.id} href={`/my-reports?r=${r.id}`} scroll={false} className="ds-row group">
                    <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                      <span className="line-clamp-2 text-base font-semibold leading-snug group-hover:underline">{titleOf(r)}</span>
                      <span className="text-sm text-body">
                        {r.kind === "incident" ? `${when(r.at, now)} · incident` : `Sent ${when(r.at, now)}`}
                      </span>
                    </span>
                    <span className={`ds-tag ${s.tag} shrink-0`}>{s.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
