import Link from "next/link";
import type { Project, User } from "@/lib/types";
import { getUser, listCorrectiveActionsForProject } from "@/lib/db";
import { switchableSites, workingSite } from "@/lib/site-focus";
import { switchSiteAction } from "@/lib/actions/site";
import { isActionOverdue } from "@/lib/metrics";
import { shortDate } from "@/lib/format";
import { nowMs } from "@/lib/time";
import { MySiteCard } from "@/components/site/my-site-card";
import { EmergencyStrip } from "@/components/site/emergency-strip";
import { Avatar } from "@/components/ui/avatar";
import { CorrectiveActionStatusBadge } from "@/components/ui/badges";
import { IconAlertTriangle, IconArrowRight, IconCamera, IconCheck, IconClipboardCheck } from "@/components/ui/icons";

const ROLE_ORDER: Record<User["role"], number> = { SUPERVISOR: 0, SAFETY_MANAGER: 1, ADMIN: 2, WORKER: 3 };

/**
 * A worker's view of one of their sites: the essentials and their own work there.
 * Managers get the full project page (health, charts, coordination) instead.
 */
export async function WorkerSiteView({ user, project, canCheckIn }: { user: User; project: Project; canCheckIn: boolean }) {
  const now = nowMs();
  const sites = switchableSites(user);
  const working = await workingSite(user);
  const isWorking = working?.id === project.id;
  const myTasks = listCorrectiveActionsForProject(project.id)
    .filter((a) => a.assignedToId === user.id && a.status !== "closed")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const crew = project.crewIds
    .map((id) => getUser(id))
    .filter((u): u is User => !!u && u.active && !u.readOnly)
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.firstName.localeCompare(b.firstName));

  const actions = [
    { href: `/hazards/new?project=${project.id}`, label: "Report a hazard", Icon: IconAlertTriangle, accent: true },
    { href: `/projects/${project.id}/inspections/new`, label: "Start an inspection", Icon: IconClipboardCheck },
    ...(canCheckIn ? [{ href: "/check-in", label: "Daily check-in", Icon: IconCamera }] : []),
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/dashboard" className="inline-flex text-sm font-medium text-foreground/60 hover:text-foreground">
        ← My Day
      </Link>

      {!isWorking && working && project.status === "active" && (
        <form action={switchSiteAction} className="card flex flex-wrap items-center gap-3 p-4">
          <input type="hidden" name="projectId" value={project.id} />
          <input type="hidden" name="redirectTo" value={`/projects/${project.id}`} />
          <p className="min-w-0 flex-1 text-sm">
            You&apos;re working on <span className="font-semibold">{working.shortName}</span> today. Switch to see your tasks and reports for{" "}
            <span className="font-semibold">{project.shortName}</span> everywhere in the app.
          </p>
          <button type="submit" className="min-h-11 rounded-xl bg-foreground px-4 text-sm font-bold text-background">
            Switch to {project.shortName}
          </button>
        </form>
      )}

      <MySiteCard
        project={project}
        sites={sites.some((s) => s.id === project.id) ? sites : [project]}
        now={now}
        switchHref={(id) => `/projects/${id}`}
        showDetailsLink={false}
      />

      {project.id === working?.id && <EmergencyStrip project={project} />}

      <div className={`grid gap-2.5 ${actions.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {actions.map(({ href, label, Icon, accent }) => (
          <Link
            key={href}
            href={href}
            className={`flex min-h-14 items-center gap-3 rounded-2xl px-4 text-[15px] font-bold transition-colors ${
              accent ? "bg-[#c2410c] text-white shadow-lg shadow-[#c2410c]/20" : "bg-surface ring-1 ring-border hover:bg-surface-muted"
            }`}
          >
            <Icon width={20} height={20} strokeWidth={2} />
            <span className="flex-1">{label}</span>
            <IconArrowRight width={16} height={16} className="opacity-60" />
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="card p-5 lg:col-span-3">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-base font-bold">My tasks here</h2>
            <span className="text-xs font-medium text-foreground/50">{myTasks.length} open</span>
          </div>
          {myTasks.length === 0 ? (
            <p className="flex min-h-20 items-center justify-center gap-2 text-sm font-semibold text-foreground/55">
              <IconCheck width={18} height={18} />
              Nothing assigned to you on this site
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {myTasks.map((a) => {
                const late = isActionOverdue(a);
                return (
                  <li key={a.id} className="relative flex items-center gap-3 py-3">
                    <span
                      aria-hidden="true"
                      className="h-10 w-1 shrink-0 rounded-full"
                      style={{ background: late ? "var(--status-critical)" : "var(--border)" }}
                    />
                    <div className="min-w-0 flex-1">
                      <Link href={`/corrective-actions/${a.id}`} className="text-sm font-semibold leading-snug after:absolute after:inset-0 hover:underline">
                        {a.description.split(" — ")[0]}
                      </Link>
                      <p className="mt-0.5 text-xs text-foreground/55">
                        {a.location ? `${a.location.level} ${a.location.zone} · ` : ""}
                        <span className={late ? "font-bold text-status-critical" : ""}>{late ? "Overdue" : `Due ${shortDate(a.dueDate)}`}</span>
                      </p>
                    </div>
                    <CorrectiveActionStatusBadge status={a.status} />
                  </li>
                );
              })}
            </ul>
          )}
          {myTasks.length > 0 && (
            <Link href="/corrective-actions" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-sidebar-accent">
              Open My Tasks <IconArrowRight width={14} height={14} />
            </Link>
          )}
        </section>

        <section className="card p-5 lg:col-span-2">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-base font-bold">Crew on site</h2>
            <span className="text-xs font-medium text-foreground/50">{crew.length} people</span>
          </div>
          <ul className="space-y-2.5">
            {crew.map((m) => (
              <li key={m.id} className="flex items-center gap-3">
                <Avatar person={m} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {m.firstName} {m.lastName}
                    {m.id === user.id && <span className="font-normal text-foreground/50"> (you)</span>}
                  </span>
                  <span className="block truncate text-xs text-foreground/55">{m.title}</span>
                </span>
                {m.role === "SUPERVISOR" && <span className="badge badge-info">Supervisor</span>}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card p-5">
        <h2 className="mb-3 text-base font-bold">Site layout</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="eyebrow mb-2">Levels</p>
            <div className="flex flex-wrap gap-1.5">
              {project.levels.map((l) => (
                <span key={l} className="rounded-lg bg-surface-muted px-2.5 py-1 text-sm font-semibold">{l}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="eyebrow mb-2">Zones</p>
            <div className="flex flex-wrap gap-1.5">
              {project.zones.map((z) => (
                <span key={z} className="rounded-lg bg-surface-muted px-2.5 py-1 text-sm font-semibold">{z}</span>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-4 text-xs text-foreground/50">
          {project.name} · Client: {project.client}
        </p>
      </section>
    </div>
  );
}
