import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { getProject, getTemplate, getUser, listInspections, listProjects, listTemplates } from "@/lib/db";
import { passRate } from "@/lib/metrics";
import { timeAgo } from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";
import { InspectionStatusBadge } from "@/components/ui/badges";
import { IconArrowRight, IconMapPin } from "@/components/ui/icons";
import { nowMs } from "@/lib/time";

const DAY = 86_400_000;
const PAGE = 30;

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

export default async function InspectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; template?: string; result?: string; limit?: string }>;
}) {
  const user = await getCurrentUser();
  const caps = getCapabilities(user.role);
  if (caps.isReadOnly || user.role === "WORKER") redirect("/dashboard");

  const sp = await searchParams;
  const limit = Math.min(200, Number(sp.limit) || PAGE);
  const all = listInspections();
  const filtered = all.filter(
    (i) =>
      (!sp.project || i.projectId === sp.project) &&
      (!sp.template || i.templateId === sp.template) &&
      (sp.result !== "findings" || i.findingIds.length > 0) &&
      (sp.result !== "clean" || !i.responses.some((r) => r.value === "fail"))
  );
  const rows = filtered.slice(0, limit);

  const week = all.filter((i) => new Date(i.submittedAt).getTime() >= nowMs() - 7 * DAY);
  const weekPass = week.length ? Math.round(week.reduce((s, i) => s + passRate(i), 0) / week.length) : 100;
  const withFindings = all.filter((i) => i.findingIds.length > 0 && new Date(i.submittedAt).getTime() >= nowMs() - 30 * DAY).length;

  const q = (over: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { project: sp.project, template: sp.template, result: sp.result, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/inspections?${s}` : "/inspections";
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Inspections</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "This week", value: week.length, sub: "inspections logged" },
          { label: "Avg. pass rate", value: `${weekPass}%`, sub: "last 7 days" },
          { label: "With findings", value: withFindings, sub: "last 30 days" },
          { label: "Showing", value: filtered.length, sub: "matching filters" },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <p className="eyebrow">{s.label}</p>
            <p className="mt-1.5 text-3xl font-semibold leading-none tracking-tight">{s.value}</p>
            <p className="mt-1 text-xs text-foreground/45">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2.5">
        <div className="flex flex-wrap gap-2">
          <Pill href={q({ project: undefined })} active={!sp.project}>All sites</Pill>
          {listProjects().map((p) => (
            <Pill key={p.id} href={q({ project: p.id })} active={sp.project === p.id}>{p.shortName}</Pill>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill href={q({ template: undefined })} active={!sp.template}>All types</Pill>
          {listTemplates(user.companyId).map((t) => (
            <Pill key={t.id} href={q({ template: t.id })} active={sp.template === t.id}>{t.name.replace(" Inspection", "").replace(" Pre-Use", "")}</Pill>
          ))}
          <span className="mx-1 self-center text-foreground/20">|</span>
          <Pill href={q({ result: undefined })} active={!sp.result}>Any result</Pill>
          <Pill href={q({ result: "findings" })} active={sp.result === "findings"}>With findings</Pill>
          <Pill href={q({ result: "clean" })} active={sp.result === "clean"}>Clean</Pill>
        </div>
      </div>

      <section className="card overflow-hidden">
        <ul className="divide-y divide-border">
          {rows.map((i) => {
            const template = getTemplate(i.templateId);
            const project = getProject(i.projectId);
            const inspector = getUser(i.inspectorId);
            const rate = passRate(i);
            const color = rate >= 95 ? "var(--status-good)" : rate >= 80 ? "var(--status-warning)" : "var(--status-critical)";
            return (
              <li key={i.id}>
                <Link href={`/inspections/${i.id}`} className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-muted">
                  {inspector && <Avatar person={inspector} size={34} />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {template?.name}
                      {i.assetTag && <span className="ml-2 rounded bg-surface-muted px-1.5 py-0.5 text-[11px] font-medium text-foreground/60">{i.assetTag}</span>}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-foreground/50">
                      <span className="flex items-center gap-1"><IconMapPin width={11} height={11} />{project?.shortName} · {i.location.level} {i.location.zone}</span>
                      <span>{inspector?.firstName} {inspector?.lastName}</span>
                      <span>{timeAgo(new Date(i.submittedAt).getTime())}</span>
                    </p>
                  </div>
                  <div className="hidden w-28 md:block">
                    <div className="mb-1 flex justify-between text-[11px]">
                      <span className="text-foreground/45">Pass</span>
                      <span className="font-semibold">{rate}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-muted">
                      <div className="h-1.5 rounded-full" style={{ width: `${rate}%`, background: color }} />
                    </div>
                  </div>
                  <div className="hidden w-24 justify-end md:flex">
                    {i.findingIds.length > 0 ? (
                      <span className="badge badge-serious">{i.findingIds.length} finding{i.findingIds.length === 1 ? "" : "s"}</span>
                    ) : (
                      <span className="badge badge-neutral">Clean</span>
                    )}
                  </div>
                  <InspectionStatusBadge status={i.status} />
                  <IconArrowRight width={15} height={15} className="text-foreground/25 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            );
          })}
        </ul>
        {rows.length === 0 && <p className="py-12 text-center text-sm text-foreground/50">No inspections match these filters.</p>}
        {filtered.length > rows.length && (
          <div className="border-t border-border p-4 text-center">
            <Link href={`${q({})}${q({}).includes("?") ? "&" : "?"}limit=${limit + PAGE}`} className="text-sm font-medium text-sidebar-accent">
              Show more ({filtered.length - rows.length} remaining)
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
