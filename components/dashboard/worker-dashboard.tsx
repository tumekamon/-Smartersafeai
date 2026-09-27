import Link from "next/link";
import type { User } from "@/lib/types";
import { getProject, getTemplate, listCertifications, listCorrectiveActions, listInspections, listProjects } from "@/lib/db";
import { certStatus, isActionOverdue } from "@/lib/metrics";
import { greeting, shortDate } from "@/lib/format";
import { updateCorrectiveActionStatusAction } from "@/lib/actions/corrective-actions";
import { CorrectiveActionStatusBadge, InspectionStatusBadge, RiskBadge } from "@/components/ui/badges";
import { IconArrowRight, IconBolt, IconCheck } from "@/components/ui/icons";
import { nowMs } from "@/lib/time";

const DAY = 86_400_000;

export function WorkerDashboard({ user }: { user: User }) {
  const projects = listProjects();
  const mine = listCorrectiveActions()
    .filter((a) => a.assignedToId === user.id && a.status !== "closed")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const mineInspections = listInspections().filter((i) => i.inspectorId === user.id);
  const inspections = [
    ...mineInspections.filter((i) => i.templateId !== "t_scissor_lift"),
    ...mineInspections.filter((i) => i.templateId === "t_scissor_lift"),
  ].slice(0, 4);
  const certs = listCertifications().filter((c) => c.userId === user.id);
  const overdue = mine.filter((a) => isActionOverdue(a)).length;
  const now = nowMs();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {greeting()}, {user.firstName}
        </h1>
        <p className="mt-1 text-sm text-foreground/60">
          {mine.length === 0
            ? "No open tasks."
            : `${mine.length} task${mine.length === 1 ? "" : "s"} assigned${overdue ? `, ${overdue} overdue` : ""}.`}
        </p>
      </div>

      <section className="hero p-6">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <p className="flex items-center gap-2 text-lg font-semibold">
            <IconBolt width={20} height={20} />
            Start an inspection
          </p>
          <div className="flex flex-wrap gap-2">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium ring-1 ring-white/15 transition-colors hover:bg-white/20"
              >
                {p.shortName}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <section className="card p-5 lg:col-span-3">
          <h2 className="mb-3 text-sm font-semibold">My tasks</h2>
          {mine.length === 0 ? (
            <p className="py-6 text-center text-sm text-foreground/50">All caught up.</p>
          ) : (
            <ul className="divide-y divide-border">
              {mine.map((a) => {
                const late = isActionOverdue(a);
                const project = getProject(a.projectId);
                return (
                  <li key={a.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">{a.description.split(" — ")[0]}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-foreground/50">
                        <span>{project?.shortName}</span>
                        {a.location && <span>{a.location.level} {a.location.zone}</span>}
                        <span className={late ? "font-semibold text-critical" : ""}>Due {shortDate(a.dueDate)}</span>
                      </p>
                    </div>
                    <RiskBadge level={a.priority} />
                    {a.status === "open" ? (
                      <form action={updateCorrectiveActionStatusAction}>
                        <input type="hidden" name="correctiveActionId" value={a.id} />
                        <input type="hidden" name="status" value="completed" />
                        <button type="submit" className="flex items-center gap-1.5 rounded-lg bg-sidebar-accent px-3 py-1.5 text-xs font-semibold text-white">
                          <IconCheck width={14} height={14} />
                          Done
                        </button>
                      </form>
                    ) : (
                      <CorrectiveActionStatusBadge status={a.status} />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="space-y-4 lg:col-span-2">
          <section className="card p-5">
            <h2 className="mb-3 text-sm font-semibold">My certifications</h2>
            {certs.length === 0 ? (
              <p className="text-sm text-foreground/50">No certifications on file.</p>
            ) : (
              <ul className="space-y-2.5">
                {certs.map((c) => {
                  const status = certStatus(c.expiresOn, now);
                  const days = Math.round((new Date(c.expiresOn).getTime() - now) / DAY);
                  return (
                    <li key={c.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate">{c.type}</span>
                      <span className={`badge ${status === "current" ? "badge-good" : status === "expiring" ? "badge-warning" : "badge-critical"}`}>
                        {status === "expired" ? `Expired ${Math.abs(days)}d ago` : status === "expiring" ? `${days} days left` : `Valid to ${shortDate(c.expiresOn)}`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-sm font-semibold">My recent inspections</h2>
            {inspections.length === 0 ? (
              <p className="text-sm text-foreground/50">You have not submitted an inspection yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {inspections.map((i) => (
                  <li key={i.id}>
                    <Link href={`/inspections/${i.id}`} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{getTemplate(i.templateId)?.name}</span>
                        <span className="block text-xs text-foreground/50">{getProject(i.projectId)?.shortName} · {shortDate(i.submittedAt)}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <InspectionStatusBadge status={i.status} />
                        <IconArrowRight width={14} height={14} className="text-foreground/25" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
