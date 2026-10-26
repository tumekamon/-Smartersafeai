import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { getCompany } from "@/lib/db";
import { shortDate } from "@/lib/format";
import { buildReport, REPORT_PERIODS } from "@/lib/reports";
import { isSiteScoped, sitesFor } from "@/lib/scope";
import { BreakdownBars } from "@/components/ui/breakdown-bars";
import { RiskBadge } from "@/components/ui/badges";
import { SectionHeader } from "@/components/ui/section-header";
import { PrintButton } from "@/components/print-button";
import { IconAlertTriangle, IconClipboardCheck, IconFileText, IconWrench } from "@/components/ui/icons";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; days?: string }>;
}) {
  const user = await getCurrentUser();
  if (!getCapabilities(user).canViewReports) redirect("/dashboard");

  const sp = await searchParams;
  const sites = sitesFor(user);
  const scoped = isSiteScoped(user);
  const site = sites.find((s) => s.id === sp.site)?.id ?? (scoped ? sites[0]?.id : undefined);
  const days = (REPORT_PERIODS as readonly number[]).includes(Number(sp.days)) ? Number(sp.days) : 30;
  const r = buildReport(user, site, days);
  const company = getCompany(user.companyId);
  const q = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ site, days: String(days), ...over })) if (v) p.set(k, v);
    return `?${p.toString()}`;
  };
  const pill = (on: boolean) =>
    `flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold ${
      on ? "bg-foreground text-background" : "bg-surface text-foreground/65 ring-1 ring-border"
    }`;

  const numbers = [
    { label: "Inspections", value: r.totals.inspections },
    { label: "Avg. pass rate", value: `${r.totals.passRate}%` },
    { label: "Findings raised", value: r.totals.findings },
    { label: "Site hazard reports", value: r.totals.siteReports },
    { label: "Fixes closed", value: r.totals.actionsClosed },
    { label: "Overdue fixes", value: r.totals.overdue, hot: r.totals.overdue > 0 },
    { label: "Incidents", value: r.totals.incidents, hot: r.totals.recordables > 0 },
    { label: "Training valid", value: `${r.totals.trainingValid}%` },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-3 print:hidden">
        <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
          {!scoped && <Link href={q({ site: undefined })} className={pill(!site)}>All sites</Link>}
          {sites.map((s) => (
            <Link key={s.id} href={q({ site: s.id })} className={pill(site === s.id)}>{s.shortName}</Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            {REPORT_PERIODS.map((d) => (
              <Link key={d} href={q({ days: String(d) })} className={pill(days === d)}>Last {d} days</Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <PrintButton />
            <a
              href={`/reports/export${q({})}`}
              className="flex min-h-12 items-center gap-2 rounded-xl px-5 text-[15px] font-bold ring-1 ring-border hover:bg-surface-muted"
            >
              Download CSV
            </a>
          </div>
        </div>
      </div>

      <article className="card space-y-8 p-6 md:p-8 print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-5">
          <div>
            <p className="text-sm font-bold text-foreground/55">{company?.name} · Safety report</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight">{r.site ? r.site.name : "All sites"}</h2>
          </div>
          <p className="text-sm text-foreground/60">
            {shortDate(r.from)} – {shortDate(r.to)} · prepared for {user.firstName} {user.lastName}
          </p>
        </header>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {numbers.map((n) => (
            <div key={n.label} className={`rounded-2xl p-4 ${n.hot ? "bg-status-critical text-white" : "bg-surface-muted/70"}`}>
              <p className="text-3xl font-extrabold leading-none">{n.value}</p>
              <p className={`mt-2 text-sm font-semibold ${n.hot ? "text-white/90" : "text-foreground/60"}`}>{n.label}</p>
            </div>
          ))}
        </section>

        <div className="grid gap-8 md:grid-cols-2">
          <section>
            <SectionHeader Icon={IconAlertTriangle} title="Findings by risk" tone="critical" />
            <div className="grid grid-cols-4 gap-2">
              {r.byRisk.map((b) => (
                <div key={b.risk} className="rounded-xl bg-surface-muted/70 p-3 text-center">
                  <p className="text-2xl font-extrabold">{b.count}</p>
                  <RiskBadge level={b.risk} />
                </div>
              ))}
            </div>
          </section>
          <section>
            <SectionHeader Icon={IconClipboardCheck} title="What went wrong" tone="warning" />
            {r.categories.length === 0 ? (
              <p className="text-sm text-foreground/55">No findings in this period.</p>
            ) : (
              <BreakdownBars items={r.categories.slice(0, 6).map((c) => ({ label: c.category, value: c.count, tone: "info" as const }))} />
            )}
          </section>
        </div>

        <section>
          <SectionHeader Icon={IconWrench} title={`Open high-risk fixes (${r.openHighRisk.length})`} tone="critical" />
          {r.openHighRisk.length === 0 ? (
            <p className="text-sm text-foreground/55">None open.</p>
          ) : (
            <ul className="divide-y divide-border">
              {r.openHighRisk.slice(0, 15).map(({ action: a, site: s, owner, overdue }) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                  <RiskBadge level={a.priority} />
                  <span className="min-w-0 flex-1 font-semibold">{a.description.split(" — ")[0]}</span>
                  <span className="text-foreground/60">{s} · {owner?.firstName}</span>
                  <span className={`badge ${overdue ? "badge-critical" : "badge-neutral"}`}>{overdue ? "Overdue" : `Due ${shortDate(a.dueDate)}`}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionHeader Icon={IconFileText} title={`Incidents (${r.totals.incidents})`} tone="warning" />
          {r.incidents.length === 0 ? (
            <p className="text-sm text-foreground/55">No incidents in this period.</p>
          ) : (
            <>
              <p className="mb-3 flex flex-wrap gap-2">
                {r.incidentsByType.map((t) => (
                  <span key={t.type} className="badge badge-neutral">{t.type}: {t.count}</span>
                ))}
                {r.totals.recordables > 0 && <span className="badge badge-critical">{r.totals.recordables} OSHA recordable</span>}
                {r.totals.lostTimeDays > 0 && <span className="badge badge-critical">{r.totals.lostTimeDays} lost-time days</span>}
              </p>
              <ul className="divide-y divide-border">
                {r.incidents.slice(0, 15).map(({ incident: i, site: s, type }) => (
                  <li key={i.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                    <span className="w-24 shrink-0 font-bold">{type}</span>
                    <span className="min-w-0 flex-1">{i.description}</span>
                    <span className="text-foreground/60">{s} · {shortDate(i.reportedAt)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </article>
    </div>
  );
}
