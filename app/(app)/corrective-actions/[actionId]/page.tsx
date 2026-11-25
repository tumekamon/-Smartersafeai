import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { getFinding, getInspection, getProject, getUser } from "@/lib/db";
import { visibleTask } from "@/lib/task-access";
import { formatSpan, windowMs } from "@/lib/fix-window";
import { PRIORITY, TASK_SOURCE, dueLabel, photoProof, taskDetail, taskTitle, tasksOnly } from "@/lib/tasks";
import { siteContacts } from "@/lib/site";
import { shortDate, shortDateTime } from "@/lib/format";
import { nowMs } from "@/lib/time";
import { updateCorrectiveActionStatusAction } from "@/lib/actions/corrective-actions";
import { CompleteTaskForm } from "@/components/tasks/complete-task-form";
import { WorkerTaskView } from "@/components/tasks/worker-task-view";
import { SendBackForm } from "@/components/tasks/send-back-form";
import { EvidenceViewer } from "@/components/review/evidence-viewer";
import { Avatar } from "@/components/ui/avatar";
import { IconAlertTriangle, IconCheck, IconClock, IconMapPin, IconPhone } from "@/components/ui/icons";

const TONE = { critical: "badge-critical", warning: "badge-warning", neutral: "badge-neutral" } as const;

export default async function TaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ actionId: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const user = await getCurrentUser();
  const caps = getCapabilities(user);
  const { actionId } = await params;
  const { done } = await searchParams;
  const a = visibleTask(user, actionId);
  if (!a) notFound();

  const now = nowMs();
  const project = getProject(a.projectId)!;
  const assignee = getUser(a.assignedToId);
  const assigner = a.assignedById ? getUser(a.assignedById) : undefined;
  const completer = a.completedById ? getUser(a.completedById) : undefined;
  const sentBackBy = a.sentBack ? getUser(a.sentBack.byId) : undefined;
  const finding = a.findingId ? getFinding(a.findingId) : undefined;
  const evidence = finding?.evidenceId ? getInspection(finding.inspectionId)?.evidence.find((e) => e.id === finding.evidenceId) : undefined;
  const p = PRIORITY[a.priority];
  const due = dueLabel(a, now);
  const mine = a.assignedToId === user.id;
  const workerView = tasksOnly(user, caps);
  const detail = taskDetail(a);
  const proof = photoProof(a);

  const steps = [
    { label: "Assigned", at: a.createdAt, on: true },
    { label: "Fixed", at: a.completedAt, on: a.status !== "open" },
    { label: "Approved", at: a.verifiedAt, on: a.status === "verified" || a.status === "closed" },
    { label: "Closed", at: a.closedAt, on: a.status === "closed" },
  ];
  const current = steps.filter((s) => s.on).length; // 1-based index of the last done step

  // A worker's own task gets the phone task screen from the design canvas (W07).
  if (workerView) {
    return (
      <WorkerTaskView
        task={a}
        project={project}
        assigner={assigner}
        completer={completer}
        sentBackBy={sentBackBy}
        finding={finding}
        evidence={evidence}
        userId={user.id}
        canComplete={mine && caps.canCompleteOwnActions && !caps.isReadOnly}
        justSent={done === "1"}
        now={now}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link href="/corrective-actions" className="inline-flex text-sm font-medium text-foreground/60 hover:text-foreground">
        ← {workerView ? "My tasks" : "Fixes"}
      </Link>

      {done === "1" && a.status === "completed" && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-status-good/10 px-4 py-3 text-sm font-semibold text-status-good">
          <IconCheck width={16} height={16} strokeWidth={2.6} /> Marked as fixed. Your supervisor will check it and approve it or send it back.
        </p>
      )}

      {/* Header */}
      <section className="card relative overflow-hidden p-5 pl-6 sm:p-6 sm:pl-7">
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5" style={{ background: p.color }} />
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-white" style={{ background: p.color }}>
            {p.label}
          </span>
          <span className="rounded-md bg-surface-muted px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-foreground/60">
            {TASK_SOURCE[a.source].label}
          </span>
          <span className="text-xs text-foreground/50">{a.category}</span>
        </div>
        <h1 className="mt-2.5 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{taskTitle(a)}</h1>
        {detail && <p className="mt-2 max-w-3xl text-[15px] text-foreground/70">{detail}</p>}

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs text-foreground/50">Where</dt>
            <dd className="mt-0.5 flex items-center gap-1 font-semibold">
              <IconMapPin width={14} height={14} className="shrink-0 text-foreground/50" />
              <span className="truncate">{a.location ? `${a.location.level} · ${a.location.zone}` : project.shortName}</span>
            </dd>
            {a.location && <dd className="text-xs text-foreground/50">{project.shortName}</dd>}
          </div>
          <div>
            <dt className="text-xs text-foreground/50">Due</dt>
            <dd className="mt-0.5 font-semibold">{shortDate(`${a.dueDate}T12:00:00`)}</dd>
            {a.status === "open" && <dd className="mt-1"><span className={`badge ${TONE[due.tone]}`}>{due.text}</span></dd>}
          </div>
          <div>
            <dt className="text-xs text-foreground/50">{workerView ? "Given by" : "Assigned to"}</dt>
            <dd className="mt-0.5 flex items-center gap-1.5 font-semibold">
              {(() => {
                const who = workerView ? assigner : assignee;
                return who ? (
                  <>
                    <Avatar person={who} size={22} />
                    <span className="truncate">{who.firstName} {who.lastName}</span>
                  </>
                ) : (
                  "—"
                );
              })()}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-foreground/50">Fix within</dt>
            <dd className="mt-0.5 font-semibold">{a.dueAt ? formatSpan(windowMs(a)) : p.within.replace("Fix within ", "")}</dd>
          </div>
        </dl>
      </section>

      {/* Progress */}
      <ol className="card grid grid-cols-4 p-4 sm:px-6">
        {steps.map((s, i) => {
          const isNow = i + 1 === current && a.status !== "closed";
          return (
            <li key={s.label} className="relative flex flex-col items-center text-center">
              {i > 0 && (
                <span aria-hidden="true" className={`absolute right-1/2 top-3.5 h-0.5 w-full ${s.on ? "bg-status-good" : "bg-border"}`} />
              )}
              <span
                className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                  s.on ? "bg-status-good text-white" : "bg-surface-muted text-foreground/40 ring-1 ring-border"
                } ${isNow ? "ring-4 ring-status-good/25" : ""}`}
              >
                {s.on ? <IconCheck width={14} height={14} strokeWidth={3} /> : i + 1}
              </span>
              <span className={`mt-1.5 text-xs font-bold ${s.on ? "" : "text-foreground/45"}`}>{s.label}</span>
              <span className="text-[11px] text-foreground/45">{s.at ? shortDate(s.at) : " "}</span>
            </li>
          );
        })}
      </ol>

      {a.status === "open" && a.sentBack && (
        <section className="flex gap-3 rounded-2xl border border-status-critical/30 bg-status-critical/5 p-4">
          <IconAlertTriangle width={20} height={20} className="mt-0.5 shrink-0 text-status-critical" />
          <div className="text-sm">
            <p className="font-bold text-status-critical">
              Sent back{sentBackBy ? ` by ${sentBackBy.firstName}` : ""} · {shortDateTime(a.sentBack.at)}
            </p>
            <p className="mt-0.5 text-foreground/80">&ldquo;{a.sentBack.note}&rdquo;</p>
          </div>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-5">
          {a.status !== "open" && (a.completionPhoto || a.completionNote) && (
            <section className="card p-5">
              <h2 className="text-base font-bold">The fix</h2>
              <p className="mt-0.5 text-xs text-foreground/55">
                {completer ? `${completer.firstName} ${completer.lastName}` : "Marked fixed"}
                {a.completedAt && ` · ${shortDateTime(a.completedAt)}`}
              </p>
              {a.completionPhoto && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.completionPhoto.dataUrl} alt="Photo of the fix" className="mt-3 max-h-96 w-full rounded-xl bg-black object-contain" />
              )}
              {a.completionNote && <p className="mt-3 rounded-xl bg-surface-muted px-3.5 py-2.5 text-sm">{a.completionNote}</p>}
            </section>
          )}

          <section className="card p-5">
            <h2 className="text-base font-bold">Why this task</h2>
            <p className="mt-0.5 text-sm text-foreground/60">{TASK_SOURCE[a.source].explain}</p>
            {finding && (
              <div className="mt-4 space-y-3">
                <EvidenceViewer finding={finding} evidence={evidence} />
                <div>
                  <p className="font-semibold">{finding.title}</p>
                  <p className="mt-1 text-sm text-foreground/70">{finding.aiExplanation}</p>
                  {finding.regulatoryReference && (
                    <p className="mt-2 inline-flex rounded-md bg-surface-muted px-2 py-1 font-mono text-[11px] text-foreground/65">{finding.regulatoryReference}</p>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="order-first space-y-4 lg:order-none">
          <section className="card p-5">
            {a.status === "open" && (mine || caps.canVerifyActions) && caps.canCompleteOwnActions && !caps.isReadOnly ? (
              <>
                <h2 className="text-base font-bold">{a.sentBack ? "Fix it again" : "Done the work?"}</h2>
                <p className="mb-4 mt-0.5 text-sm text-foreground/60">
                  {proof === "required"
                    ? "Add a photo so your supervisor can approve it without walking over."
                    : "Say what you did. A photo helps, but this job doesn't need one."}
                </p>
                <CompleteTaskForm taskId={a.id} taskLabel={taskTitle(a)} userId={user.id} onBehalfOf={mine ? undefined : assignee?.firstName} proof={proof} />
              </>
            ) : a.status === "open" ? (
              <StatusNote Icon={IconClock} title={`Waiting for ${assignee?.firstName ?? "the assignee"}`} text={`Due ${shortDate(`${a.dueDate}T12:00:00`)}.`} />
            ) : a.status === "completed" ? (
              <>
                <StatusNote Icon={IconClock} title="Being checked" text={mine ? "Your supervisor will look at what you sent and approve it or send it back." : "Check the photo or note, then approve or send back."} tone="info" />
                {caps.canVerifyActions && !caps.isReadOnly && !mine && (
                  <div className="mt-4 space-y-2">
                    <form action={updateCorrectiveActionStatusAction}>
                      <input type="hidden" name="correctiveActionId" value={a.id} />
                      <input type="hidden" name="status" value="verified" />
                      <button type="submit" className="min-h-11 w-full rounded-xl bg-status-good text-sm font-bold text-white">Approve fix</button>
                    </form>
                    <SendBackForm taskId={a.id} />
                  </div>
                )}
              </>
            ) : a.status === "verified" ? (
              <>
                <StatusNote Icon={IconCheck} title="Fix approved" text="Safety will close it out." tone="good" />
                {caps.canCloseActions && !caps.isReadOnly && (
                  <form action={updateCorrectiveActionStatusAction} className="mt-4">
                    <input type="hidden" name="correctiveActionId" value={a.id} />
                    <input type="hidden" name="status" value="closed" />
                    <button type="submit" className="min-h-11 w-full rounded-xl bg-foreground text-sm font-bold text-background">Close out</button>
                  </form>
                )}
              </>
            ) : (
              <StatusNote Icon={IconCheck} title="Closed" text={`Finished ${shortDate(a.closedAt ?? a.createdAt)}. Thanks for making the site safer.`} tone="good" />
            )}
          </section>

          {workerView && (
            <section className="card p-4">
              <h2 className="text-sm font-bold">Questions about this task?</h2>
              <ul className="mt-3 space-y-2">
                {(assigner ? [{ user: assigner, role: "Gave you this task" }] : siteContacts(project).slice(0, 2).map((c) => ({ user: c.user, role: c.role }))).map(({ user: c, role }) => (
                  <li key={c.id} className="flex items-center gap-3">
                    <Avatar person={c} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{c.firstName} {c.lastName}</span>
                      <span className="block truncate text-xs text-foreground/50">{role}</span>
                    </span>
                    {c.phone && (
                      <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} aria-label={`Call ${c.firstName}`} className="flex h-10 w-10 items-center justify-center rounded-full bg-status-good text-white">
                        <IconPhone width={17} height={17} />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function StatusNote({
  Icon,
  title,
  text,
  tone = "neutral",
}: {
  Icon: typeof IconCheck;
  title: string;
  text: string;
  tone?: "neutral" | "info" | "good";
}) {
  const color = tone === "good" ? "var(--status-good)" : tone === "info" ? "var(--sidebar-accent)" : "var(--foreground)";
  return (
    <div className="flex gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
        <Icon width={20} height={20} strokeWidth={2.2} />
      </span>
      <div>
        <p className="font-bold">{title}</p>
        <p className="mt-0.5 text-sm text-foreground/60">{text}</p>
      </div>
    </div>
  );
}
