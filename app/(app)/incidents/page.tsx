import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { getProject, getUser, listIncidents, listProjects } from "@/lib/db";
import { updateIncidentStatusAction } from "@/lib/actions/incidents";
import { shortDateTime } from "@/lib/format";
import { IncidentStatusBadge, IncidentTypeBadge } from "@/components/ui/badges";
import { Avatar } from "@/components/ui/avatar";
import { IconArrowRight, IconMapPin, IconPlus } from "@/components/ui/icons";
import type { IncidentStatus } from "@/lib/types";

const NEXT: Record<IncidentStatus, { next: IncidentStatus; label: string } | null> = {
  open: { next: "investigating", label: "Start investigating" },
  investigating: { next: "closed", label: "Close out" },
  closed: null,
};

function Pill({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
        active ? "bg-foreground text-background" : "bg-surface text-foreground/65 ring-1 ring-border hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; status?: string }>;
}) {
  const user = await getCurrentUser();
  const caps = getCapabilities(user.role);
  const sp = await searchParams;

  const all = listIncidents(user.companyId).filter(
    (i) => (!sp.project || i.projectId === sp.project) && (!sp.status || i.status === sp.status)
  );
  const openCount = all.filter((i) => i.status !== "closed").length;
  const recordableCount = all.filter((i) => i.oshaRecordable).length;

  const q = (over: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { project: sp.project, status: sp.status, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/incidents?${s}` : "/incidents";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Incident log</h1>
          <p className="mt-1 text-sm text-foreground/60">
            {openCount} open or under investigation
            {recordableCount > 0 && <span className="font-semibold text-critical"> · {recordableCount} OSHA recordable</span>}
          </p>
        </div>
        {!caps.isReadOnly && (
          <Link href="/incidents/new" className="flex items-center gap-1.5 rounded-lg bg-sidebar-accent px-3.5 py-2 text-sm font-semibold text-white">
            <IconPlus width={14} height={14} />
            Report incident
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Pill href={q({ status: undefined })} active={!sp.status}>All statuses</Pill>
        <Pill href={q({ status: "open" })} active={sp.status === "open"}>Open</Pill>
        <Pill href={q({ status: "investigating" })} active={sp.status === "investigating"}>Investigating</Pill>
        <Pill href={q({ status: "closed" })} active={sp.status === "closed"}>Closed</Pill>
        <span className="mx-1 self-center text-foreground/20">|</span>
        <Pill href={q({ project: undefined })} active={!sp.project}>All sites</Pill>
        {listProjects(user.companyId).map((p) => (
          <Pill key={p.id} href={q({ project: p.id })} active={sp.project === p.id}>{p.shortName}</Pill>
        ))}
      </div>

      {all.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-12 text-center">
          <p className="text-sm font-medium">No incidents match this filter</p>
          <p className="max-w-sm text-xs text-foreground/50">Near misses, first aid, recordables, and property damage all get logged here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {all.map((incident) => {
            const project = getProject(incident.projectId);
            const reporter = getUser(incident.reportedById);
            const step = !caps.isReadOnly && caps.canReviewFindings ? NEXT[incident.status] : null;
            return (
              <section key={incident.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <IncidentTypeBadge type={incident.type} />
                      {incident.oshaRecordable && <span className="badge badge-critical">OSHA recordable</span>}
                    </div>
                    <h3 className="mt-2 text-sm font-semibold leading-snug">{incident.description}</h3>
                    <p className="mt-1 flex items-center gap-1 text-xs text-foreground/50">
                      <IconMapPin width={11} height={11} />
                      {project?.shortName} · {incident.location.level} {incident.location.zone}
                    </p>
                  </div>
                  <IncidentStatusBadge status={incident.status} />
                </div>

                {incident.immediateAction && (
                  <p className="mt-3 rounded-lg bg-surface-muted p-3 text-sm">
                    <span className="font-medium">Immediate action:</span> {incident.immediateAction}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs text-foreground/55">
                    {reporter && <Avatar person={reporter} size={20} />}
                    Reported by {reporter?.firstName} · {shortDateTime(incident.reportedAt)}
                    {incident.lostTimeDays > 0 && <span className="font-medium tone-critical"> · {incident.lostTimeDays}d lost time</span>}
                  </span>
                </div>

                {step && (
                  <form action={updateIncidentStatusAction} className="mt-3">
                    <input type="hidden" name="incidentId" value={incident.id} />
                    <input type="hidden" name="status" value={step.next} />
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-surface-muted py-1.5 text-xs font-semibold transition-colors hover:bg-sidebar-accent hover:text-white"
                    >
                      {step.label}
                      <IconArrowRight width={12} height={12} />
                    </button>
                  </form>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
