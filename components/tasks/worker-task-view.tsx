import Link from "next/link";
import type { CorrectiveAction, Evidence, Finding, Project, User } from "@/lib/types";
import { getInspection, getTemplate } from "@/lib/db";
import { formatSpan, windowMs } from "@/lib/fix-window";
import { PRIORITY, TASK_SOURCE, countdown, photoProof, taskDetail, taskTitle } from "@/lib/tasks";
import { shortDateTime } from "@/lib/format";
import { CompleteTaskForm } from "@/components/tasks/complete-task-form";
import { EvidenceViewer } from "@/components/review/evidence-viewer";
import { IconCheck, IconChevronLeft, IconClock, IconPhone } from "@/components/ui/icons";

const clock = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const TONE = { critical: "tone-critical", warning: "tone-warning", neutral: "" } as const;

/**
 * A worker's task (design canvas W07): what and how urgent, the time left in big type,
 * where / who / found in, the hazard photo beside the proof photo, and Mark fixed at the
 * bottom. Once it's sent, the same screen shows where the fix has got to.
 */
export function WorkerTaskView({
  task: a,
  project,
  assigner,
  completer,
  sentBackBy,
  finding,
  evidence,
  userId,
  canComplete,
  justSent,
  now,
}: {
  task: CorrectiveAction;
  project: Project;
  assigner?: User;
  completer?: User;
  sentBackBy?: User;
  finding?: Finding;
  evidence?: Evidence;
  userId: string;
  canComplete: boolean;
  justSent: boolean;
  now: number;
}) {
  const p = PRIORITY[a.priority];
  const urgent = a.priority === "critical" || a.priority === "high";
  const within = a.dueAt ? `fix within ${formatSpan(windowMs(a))}` : p.within.replace("Fix", "fix");
  const left = countdown(a, now);
  const dueAt = a.dueAt ? Date.parse(a.dueAt) : undefined;
  const dueToday = dueAt !== undefined && new Date(dueAt).toDateString() === new Date(now).toDateString();
  const detail = taskDetail(a);
  const inspection = finding ? getInspection(finding.inspectionId) : undefined;
  const foundIn = inspection
    ? `${inspection.templateId === "t_hazard_report" ? "Hazard report" : (getTemplate(inspection.templateId)?.name ?? "Inspection")}, ${clock(Date.parse(inspection.submittedAt))}`
    : TASK_SOURCE[a.source].label;
  const checker = assigner?.firstName;
  const before = finding && (evidence || finding.scene) ? <EvidenceViewer finding={finding} evidence={evidence} /> : undefined;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-[22px] lg:pt-0">
      <Link href="/corrective-actions" className="ds-back self-start">
        <IconChevronLeft width={18} height={18} /> Tasks
      </Link>

      {justSent && a.status === "completed" && (
        <p role="status" className="ds-note text-[15px]">
          <span className="eyebrow" style={{ color: "var(--brand)" }}>
            Sent
          </span>
          {checker ?? "Your supervisor"} will check it and approve it or send it back.
        </p>
      )}

      <header className="flex flex-col gap-3">
        <span className={`eyebrow ${urgent ? "tone-critical" : a.priority === "medium" ? "tone-warning" : ""}`}>
          {p.label} · {within}
        </span>
        <h1 className="disp text-[32px] leading-[1.05]">{taskTitle(a)}</h1>
        {detail && <p className="text-[15px] leading-relaxed text-body">{detail}</p>}
      </header>

      {a.status === "open" && a.sentBack && (
        <div className="ds-note">
          <span className="eyebrow" style={{ color: "var(--brand)" }}>
            Sent back{sentBackBy ? ` by ${sentBackBy.firstName}` : ""} · {shortDateTime(a.sentBack.at)}
          </span>
          <span className="text-[15px] leading-relaxed">&ldquo;{a.sentBack.note}&rdquo;</span>
        </div>
      )}

      {/* Time left, or where the fix has got to. */}
      <div className="flex items-end justify-between gap-4 border-t-2 border-brand pt-3.5">
        {a.status === "open" ? (
          <>
            <div className="flex flex-col gap-1">
              <span className="eyebrow">{left.text.endsWith("over") ? "Overdue by" : "Time left"}</span>
              <span className={`disp text-[56px] leading-[0.9] ${TONE[left.tone]}`}>{left.text.replace(" over", "")}</span>
            </div>
            <span className="text-right text-sm text-body">
              Due{dueAt ? ` ${clock(dueAt)}` : ""}
              <br />
              {dueAt && dueToday ? "Today" : new Date(dueAt ?? `${a.dueDate}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
            </span>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-full text-white ${a.status === "completed" ? "bg-[#0F4C81]" : "bg-status-good"}`}
            >
              {a.status === "completed" ? <IconClock width={20} height={20} /> : <IconCheck width={20} height={20} strokeWidth={2.6} />}
            </span>
            <span className="flex flex-col">
              <span className="text-lg font-semibold">
                {a.status === "completed" ? "Being checked" : a.status === "verified" ? "Fix approved" : "Closed"}
              </span>
              <span className="text-sm text-body">
                {a.status === "completed"
                  ? `${checker ?? "Your supervisor"} approves it or sends it back.`
                  : `Thanks for making the site safer.`}
              </span>
            </span>
          </div>
        )}
      </div>

      <dl className="flex flex-col">
        <Kv k="Where" v={a.location ? `${a.location.level} · ${a.location.zone}` : project.shortName} />
        <Kv
          k="Assigned by"
          v={
            assigner ? (
              <span className="flex items-center gap-2">
                {assigner.firstName} {assigner.lastName}
                {assigner.phone && (
                  <a
                    href={`tel:${assigner.phone.replace(/[^\d+]/g, "")}`}
                    aria-label={`Call ${assigner.firstName}`}
                    className="-my-2 flex h-9 w-9 items-center justify-center rounded-full border border-border tone-good"
                  >
                    <IconPhone width={15} height={15} strokeWidth={2} />
                  </a>
                )}
              </span>
            ) : (
              "Safety team"
            )
          }
        />
        <Kv k="Found in" v={foundIn} />
      </dl>

      {/* Why this task: what was found, what the AI saw, and the rule it breaks. */}
      <section aria-labelledby="why-head" className="flex flex-col gap-2">
        <div className="ds-sec">
          <h2 id="why-head" className="eyebrow" style={{ color: "var(--foreground)" }}>
            Why this task
          </h2>
          <span className="eyebrow">{TASK_SOURCE[a.source].label}</span>
        </div>
        {finding ? (
          <>
            <p className="pt-1 text-base font-semibold">{finding.title}</p>
            {finding.aiExplanation && finding.aiExplanation !== finding.title && (
              <p className="text-[15px] leading-relaxed text-body">{finding.aiExplanation}</p>
            )}
            {finding.regulatoryReference && <span className="ds-tag ds-tag-neutral self-start">{finding.regulatoryReference}</span>}
          </>
        ) : (
          <p className="pt-1 text-[15px] leading-relaxed text-body">{TASK_SOURCE[a.source].explain}</p>
        )}
      </section>

      {a.status === "open" && canComplete ? (
        <CompleteTaskForm
          taskId={a.id}
          taskLabel={taskTitle(a)}
          userId={userId}
          proof={photoProof(a)}
          variant="worker"
          before={before}
          checker={checker}
        />
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="eyebrow">Before</span>
            {before ?? <span className="flex h-28 items-center justify-center rounded-lg bg-surface-muted text-[13px] text-body">No photo</span>}
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="eyebrow">After</span>
            {a.completionPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.completionPhoto.dataUrl} alt="Photo of the fix" className="h-28 w-full rounded-lg bg-black object-cover" />
            ) : (
              <span className="flex h-28 items-center justify-center rounded-lg bg-surface-muted px-3 text-center text-[13px] text-body">
                {a.status === "open" ? "Not fixed yet" : "No photo"}
              </span>
            )}
          </div>
          {a.completionNote && (
            <p className="col-span-2 text-[15px] leading-relaxed">
              <span className="text-body">{completer ? `${completer.firstName}: ` : ""}</span>
              {a.completionNote}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Kv({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3 text-[15px]">
      <dt className="text-body">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}
