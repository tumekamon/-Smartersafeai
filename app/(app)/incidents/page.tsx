import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { siteIdsFor, sitesFor } from "@/lib/scope";
import { getCapabilities } from "@/lib/authz";
import { getCompany, getProject, getUser, listIncidents } from "@/lib/db";
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
      className={`flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors ${
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
  const caps = getCapabilities(user);
  const sp = await searchParams;

  const sites = siteIdsFor(user);
  const fields = getCompany(user.companyId)?.incidentFields ?? [];
  const all = listIncidents(user.companyId).filter(
    (i) => sites.has(i.projectId) && (!sp.project || i.projectId === sp.project) && (!sp.status || i.status === sp.status)
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
          <Link href="/incidents/new" className="flex min-h-12 items-center gap-2 rounded-xl bg-sidebar-accent px-5 text-[15px] font-bold text-white">
            <IconPlus width={18} height={18} strokeWidth={2.4} />
            Report incident
          </Link>
        )}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
        <Pill href={q({ status: undefined })} active={!sp.status}>All statuses</Pill>
        <Pill href={q({ status: "open" })} active={sp.status === "open"}>Open</Pill>
        <Pill href={q({ status: "investigating" })} active={sp.status === "investigating"}>Investigating</Pill>
        <Pill href={q({ status: "closed" })} active={sp.status === "closed"}>Closed</Pill>
        <span className="mx-1 self-center text-foreground/20">|</span>
        <Pill href={q({ project: undefined })} active={!sp.project}>All sites</Pill>
        {sitesFor(user).map((p) => (
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
              <section key={incident.id} className="card relative overflow-hidden p-5 pl-6">
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 w-1.5"
                  style={{ background: incident.status === "closed" ? "var(--status-good)" : incident.oshaRecordable ? "var(--status-critical)" : "var(--status-warning)" }}
                />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <IncidentTypeBadge type={incident.type} />
                      {incident.oshaRecordable && <span className="badge badge-critical">OSHA recordable</span>}
                    </div>
                    <h3 className="mt-2 text-[15px] font-semibold leading-snug">{incident.description}</h3>
                    <p className="mt-1 flex items-center gap-1 text-xs text-foreground/50">
                      <IconMapPin width={11} height={11} />
                      {project?.shortName} · {incident.location.level} {incident.location.zone}
                    </p>
                  </div>
                  <IncidentStatusBadge status={incident.status} />
                </div>

                {fields.some((f) => incident.customAnswers?.[f.id]) && (
                  <dl className="mt-3 grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
                    {fields
                      .filter((f) => incident.customAnswers?.[f.id])
                      .map((f) => (
                        <div key={f.id} className="rounded-lg bg-surface-muted/70 px-3 py-2">
                          <dt className="text-xs font-semibold text-foreground/55">{f.label}</dt>
                          <dd className="font-semibold">{incident.customAnswers?.[f.id]}</dd>
                        </div>
                      ))}
                  </dl>
                )}

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
                      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-surface-muted text-sm font-bold transition-colors hover:bg-sidebar-accent hover:text-white"
                    >
                      {step.label}
                      <IconArrowRight width={16} height={16} />
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
