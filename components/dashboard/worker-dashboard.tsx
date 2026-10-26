import Link from "next/link";
import { sitesFor } from "@/lib/scope";
import { visibleSections } from "@/lib/home-layout";
import type { RiskLevel, User } from "@/lib/types";
import { getCompany, getProject, getTemplate, listCertifications, listCorrectiveActions, listInspections } from "@/lib/db";
import { certStatus, isActionOverdue } from "@/lib/metrics";
import { greeting, shortDate } from "@/lib/format";
import { updateCorrectiveActionStatusAction } from "@/lib/actions/corrective-actions";
import { CorrectiveActionStatusBadge, InspectionStatusBadge } from "@/components/ui/badges";
import { IconAlertTriangle, IconArrowRight, IconBolt, IconCheck } from "@/components/ui/icons";
import { nowMs } from "@/lib/time";

const DAY = 86_400_000;

export function WorkerDashboard({ user }: { user: User }) {
  const projects = sitesFor(user).filter((p) => p.status === "active");
  const mine = listCorrectiveActions(user.companyId)
    .filter((a) => a.assignedToId === user.id && a.status !== "closed")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const mineInspections = listInspections(user.companyId).filter((i) => i.inspectorId === user.id);
  const inspections = [
    ...mineInspections.filter((i) => i.templateId !== "t_scissor_lift"),
    ...mineInspections.filter((i) => i.templateId === "t_scissor_lift"),
  ].slice(0, 4);
  const certs = listCertifications(user.companyId).filter((c) => c.userId === user.id);
  const overdue = mine.filter((a) => isActionOverdue(a)).length;
  const now = nowMs();

  const expiringCerts = certs.filter((c) => certStatus(c.expiresOn, now) !== "current").length;
  const show = visibleSections(getCompany(user.companyId), "WORKER");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
        {greeting()}, {user.firstName}
      </h1>

      {show.has("tiles") && (
        <div className="grid grid-cols-3 gap-2.5 md:gap-4">
          <StatTile href="/corrective-actions" value={overdue} label="Overdue" hot={overdue > 0} />
          <StatTile href="/corrective-actions" value={mine.length} label="My tasks" />
          <StatTile href="#certs" value={expiringCerts} label="Certs due" hot={expiringCerts > 0} />
        </div>
      )}

      {show.has("hazard") && (
        <Link
          href="/hazards/new"
          className="flex min-h-20 items-center gap-4 rounded-2xl bg-[#c2410c] px-5 text-white shadow-lg shadow-[#c2410c]/25"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20">
            <IconAlertTriangle width={26} height={26} strokeWidth={2} />
          </span>
          <span className="flex-1">
            <span className="block text-lg font-extrabold">Report a hazard</span>
            <span className="block text-sm text-white/90">Photo + 3 taps</span>
          </span>
          <IconArrowRight width={22} height={22} />
        </Link>
      )}

      {show.has("inspect") && projects.length > 0 && (
        <section className="hero p-5 md:p-6">
          <p className="mb-3 flex items-center gap-2 text-lg font-bold">
            <IconBolt width={22} height={22} />
            Start an inspection
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}/inspections/new`}
                className="hero-tile hero-tile-hover flex min-h-14 items-center justify-between gap-2 rounded-2xl px-4 text-[15px] font-bold transition-colors"
              >
                {p.shortName}
                <IconArrowRight width={18} height={18} />
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {show.has("tasks") && (
          <section className={show.has("certs") || show.has("recent") ? "lg:col-span-3" : "lg:col-span-5"}>
            <h2 className="mb-3 text-lg font-bold">My tasks</h2>
            {mine.length === 0 ? (
              <p className="card flex min-h-24 items-center justify-center gap-2 text-base font-semibold text-foreground/60">
                <IconCheck width={20} height={20} />
                All caught up
              </p>
            ) : (
              <ul className="space-y-2.5">
                {mine.map((a) => {
                  const late = isActionOverdue(a);
                  const project = getProject(a.projectId);
                  return (
                    <li key={a.id} className="card flex items-center gap-3 p-3">
                      <span
                        aria-hidden="true"
                        className="h-14 w-1.5 shrink-0 rounded-full"
                        style={{ background: late ? "var(--status-critical)" : priorityColor[a.priority] }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold leading-snug">{a.description.split(" — ")[0]}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-foreground/60">
                          <span>{project?.shortName}</span>
                          {a.location && <span>· {a.location.level} {a.location.zone}</span>}
                          <span className={late ? "font-bold text-critical" : ""}>· {late ? "Overdue" : `Due ${shortDate(a.dueDate)}`}</span>
                        </p>
                      </div>
                      {a.status === "open" ? (
                        <form action={updateCorrectiveActionStatusAction}>
                          <input type="hidden" name="correctiveActionId" value={a.id} />
                          <input type="hidden" name="status" value="completed" />
                          <button
                            type="submit"
                            aria-label={`Mark done: ${a.description.split(" — ")[0]}`}
                            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-background"
                          >
                            <IconCheck width={26} height={26} strokeWidth={2.6} />
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
        )}

        {(show.has("certs") || show.has("recent")) && (
          <div className={`space-y-4 ${show.has("tasks") ? "lg:col-span-2" : "lg:col-span-5"}`}>
            {show.has("certs") && (
              <section id="certs" className="card p-5">
                <h2 className="mb-3 text-base font-bold">My certifications</h2>
                {certs.length === 0 ? (
                  <p className="text-sm text-foreground/50">No certifications on file.</p>
                ) : (
                  <ul className="space-y-2">
                    {certs.map((c) => {
                      const status = certStatus(c.expiresOn, now);
                      const days = Math.round((new Date(c.expiresOn).getTime() - now) / DAY);
                      return (
                        <li key={c.id} className="flex min-h-11 items-center justify-between gap-3 text-sm">
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              aria-hidden="true"
                              className="h-3 w-3 shrink-0 rounded-full"
                              style={{ background: status === "current" ? "var(--status-good)" : status === "expiring" ? "var(--status-warning)" : "var(--status-critical)" }}
                            />
                            <span className="truncate font-medium">{c.type}</span>
                          </span>
                          <span className={`badge ${status === "current" ? "badge-good" : status === "expiring" ? "badge-warning" : "badge-critical"}`}>
                            {status === "expired" ? `Expired ${Math.abs(days)}d` : status === "expiring" ? `${days}d left` : "Valid"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}

            {show.has("recent") && (
              <section className="card p-5">
                <h2 className="mb-3 text-base font-bold">My recent inspections</h2>
                {inspections.length === 0 ? (
                  <p className="text-sm text-foreground/50">You have not submitted an inspection yet.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {inspections.map((i) => (
                      <li key={i.id}>
                        <Link href={`/inspections/${i.id}`} className="flex min-h-14 items-center justify-between gap-3 py-2">
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">{getTemplate(i.templateId)?.name}</span>
                            <span className="block text-xs text-foreground/55">{getProject(i.projectId)?.shortName} · {shortDate(i.submittedAt)}</span>
                          </span>
                          <span className="flex items-center gap-2">
                            <InspectionStatusBadge status={i.status} />
                            <IconArrowRight width={14} height={14} className="text-foreground/30" />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const priorityColor: Record<RiskLevel, string> = {
  critical: "var(--status-critical)",
  high: "var(--status-serious)",
  medium: "var(--status-warning)",
  low: "var(--chart-series-1)",
};

function StatTile({ href, value, label, hot = false }: { href: string; value: number; label: string; hot?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex min-h-24 flex-col justify-between rounded-2xl p-3.5 md:min-h-28 md:p-4 ${
        hot ? "bg-status-critical text-white" : "card"
      }`}
    >
      <span className="text-3xl font-extrabold leading-none md:text-4xl">{value}</span>
      <span className={`text-sm font-semibold ${hot ? "text-white/90" : "text-foreground/65"}`}>{label}</span>
    </Link>
  );
}
