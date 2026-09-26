import Link from "next/link";
import { getProject, getUser, listCertifications, listGcNotices, listInspections, listPermits, listPpeItems, listUsers } from "@/lib/db";
import {
  certStatus,
  equipmentSummary,
  permitState,
  permitSummary,
  ppeStatus,
  ppeSummary,
  trainingSummary,
  type CertStatus,
} from "@/lib/metrics";
import { currency, shortDate, shortDateTime } from "@/lib/format";
import type { CertificationType } from "@/lib/types";
import { Donut } from "@/components/viz/donut";
import { Avatar } from "@/components/ui/avatar";
import { IconArrowRight } from "@/components/ui/icons";
import { nowMs } from "@/lib/time";

const DAY = 86_400_000;
const TABS = [
  { id: "training", label: "Training" },
  { id: "permits", label: "Permits" },
  { id: "ppe", label: "PPE" },
  { id: "equipment", label: "Equipment" },
  { id: "notices", label: "GC notices" },
] as const;

const CERT_COLUMNS: { type: CertificationType; short: string }[] = [
  { type: "Electrical Safety (NFPA 70E)", short: "NFPA 70E" },
  { type: "LOTO Authorized", short: "LOTO" },
  { type: "HAZCOM", short: "HAZCOM" },
  { type: "First Aid / CPR", short: "First aid" },
  { type: "Fall Protection", short: "Fall prot." },
  { type: "Aerial Lift Operator", short: "Aerial lift" },
];

const statusRank: Record<CertStatus, number> = { expired: 0, expiring: 1, current: 2 };
const noticeTone = { open: "badge-warning", acknowledged: "badge-info", resolved: "badge-good" } as const;

export default async function CompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "training" } = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Regulatory readiness</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Compliance</h1>
      </div>

      <nav className="inline-flex flex-wrap gap-1 rounded-xl bg-surface p-1 ring-1 ring-border">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/compliance?tab=${t.id}`}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t.id ? "bg-foreground text-background" : "text-foreground/60 hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "training" && <Training />}
      {tab === "permits" && <Permits />}
      {tab === "ppe" && <Ppe />}
      {tab === "equipment" && <Equipment />}
      {tab === "notices" && <Notices />}
    </div>
  );
}

function Training() {
  const now = nowMs();
  const summary = trainingSummary();
  const certs = listCertifications();
  const people = listUsers().filter((u) => certs.some((c) => c.userId === u.id));
  const rows = people
    .map((p) => {
      const mine = certs.filter((c) => c.userId === p.id);
      const worst = Math.min(...mine.map((c) => statusRank[certStatus(c.expiresOn, now)]));
      return { person: p, mine, worst };
    })
    .sort((a, b) => a.worst - b.worst || a.person.lastName.localeCompare(b.person.lastName));

  return (
    <div className="space-y-5">
      <section className="card flex flex-wrap items-center gap-8 p-5">
        <Donut
          size={120}
          stroke={14}
          center={`${Math.round(summary.compliantPercent)}%`}
          caption="valid"
          segments={[
            { label: "Current", value: summary.current, color: "var(--status-good)" },
            { label: "Expiring in 30 days", value: summary.expiring, color: "var(--status-warning)" },
            { label: "Expired", value: summary.expired, color: "var(--status-critical)" },
          ]}
        />
        <div className="grid flex-1 grid-cols-3 gap-4 text-center sm:max-w-md">
          {[
            { v: summary.current, l: "Current", c: "var(--status-good)" },
            { v: summary.expiring, l: "Expiring in 30 days", c: "var(--status-warning)" },
            { v: summary.expired, l: "Expired", c: "var(--status-critical)" },
          ].map((s) => (
            <div key={s.l}>
              <p className="text-3xl font-semibold" style={{ color: s.c }}>{s.v}</p>
              <p className="mt-0.5 text-xs text-foreground/50">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-wider text-foreground/45">
                <th className="px-5 py-3 font-semibold">Team member</th>
                {CERT_COLUMNS.map((c) => (
                  <th key={c.type} className="px-2 py-3 text-center font-semibold">{c.short}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ person, mine }) => (
                <tr key={person.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-3">
                      <Avatar person={person} size={30} />
                      <div>
                        <p className="text-sm font-medium">{person.firstName} {person.lastName}</p>
                        <p className="text-[11px] text-foreground/45">{person.title}</p>
                      </div>
                    </div>
                  </td>
                  {CERT_COLUMNS.map((col) => {
                    const c = mine.find((m) => m.type === col.type);
                    if (!c) return <td key={col.type} className="px-2 py-2.5 text-center text-foreground/20">–</td>;
                    const s = certStatus(c.expiresOn, now);
                    const days = Math.round((new Date(c.expiresOn).getTime() - now) / DAY);
                    return (
                      <td key={col.type} className="px-2 py-2.5 text-center">
                        <span
                          title={`${c.type} · expires ${shortDate(c.expiresOn)}`}
                          className={`badge justify-center ${s === "current" ? "badge-good" : s === "expiring" ? "badge-warning" : "badge-critical"}`}
                          style={{ minWidth: "5.4rem" }}
                        >
                          {s === "expired" ? `${Math.abs(days)}d over` : s === "expiring" ? `${days}d left` : new Date(c.expiresOn).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Permits() {
  const now = nowMs();
  const permits = listPermits();
  const summary = permitSummary();
  const active = permits.filter((p) => permitState(p, now) === "active");
  const log = permits.filter((p) => new Date(p.startsAt).getTime() <= now).slice(0, 30);
  const stateBadge = { active: "badge-good", closed: "badge-neutral", expired: "badge-serious", upcoming: "badge-info" } as const;
  const stateLabel = { active: "Active", closed: "Closed", expired: "Expired, not closed", upcoming: "Scheduled" } as const;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { v: summary.active, l: "Active now" },
          { v: summary.expiredOpen, l: "Expired, not closed", warn: summary.expiredOpen > 0 },
          { v: summary.last30, l: "Issued, last 30 days" },
        ].map((s) => (
          <div key={s.l} className="card p-4">
            <p className={`text-3xl font-semibold ${s.warn ? "tone-serious" : ""}`}>{s.v}</p>
            <p className="mt-1 text-xs text-foreground/50">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {active.map((p) => {
          const start = new Date(p.startsAt).getTime();
          const end = new Date(p.expiresAt).getTime();
          const pct = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
          const hoursLeft = Math.max(0, (end - now) / 3_600_000);
          const issuer = getUser(p.issuedById);
          const attendant = getUser(p.attendantId ?? "");
          return (
            <section key={p.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">{p.type}</p>
                  <h3 className="mt-1 text-sm font-semibold leading-snug">{p.description}</h3>
                  <p className="mt-1 text-xs text-foreground/50">{getProject(p.projectId)?.shortName} · {p.location.level} {p.location.zone}</p>
                </div>
                <span className="live-dot mt-1 shrink-0" />
              </div>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-[11px] text-foreground/50">
                  <span>{shortDateTime(p.startsAt)}</span>
                  <span className="font-semibold text-foreground">{hoursLeft < 1 ? "under 1h left" : `${hoursLeft.toFixed(1)}h left`}</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-muted">
                  <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: pct > 85 ? "var(--status-warning)" : "var(--chart-series-1)" }} />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3 text-xs text-foreground/55">
                {issuer && <span className="flex items-center gap-1.5"><Avatar person={issuer} size={20} />Issued by {issuer.firstName}</span>}
                {attendant && <span className="flex items-center gap-1.5"><Avatar person={attendant} size={20} />Watch: {attendant.firstName}</span>}
              </div>
            </section>
          );
        })}
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-border px-5 py-3.5"><h2 className="text-sm font-semibold">Permit log</h2></div>
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-wider text-foreground/45">
                <th className="px-5 py-2.5 font-semibold">Permit</th>
                <th className="px-3 py-2.5 font-semibold">Location</th>
                <th className="px-3 py-2.5 font-semibold">Issued by</th>
                <th className="px-3 py-2.5 font-semibold">Window</th>
                <th className="px-5 py-2.5 text-right font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {log.map((p) => {
                const st = permitState(p, now);
                const issuer = getUser(p.issuedById);
                return (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-2.5"><p className="font-medium">{p.type}</p><p className="text-xs text-foreground/50">{p.description}</p></td>
                    <td className="px-3 py-2.5 text-foreground/70">{getProject(p.projectId)?.shortName}<span className="text-foreground/45"> · {p.location.level} {p.location.zone}</span></td>
                    <td className="px-3 py-2.5 text-foreground/70">{issuer?.firstName} {issuer?.lastName}</td>
                    <td className="px-3 py-2.5 text-xs text-foreground/55">{shortDateTime(p.startsAt)}</td>
                    <td className="px-5 py-2.5 text-right"><span className={`badge ${stateBadge[st]}`}>{stateLabel[st]}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Ppe() {
  const items = listPpeItems();
  const summary = ppeSummary();
  const pct = Math.min(100, Math.round((summary.spent / summary.budget) * 100));

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">PPE budget</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">{currency(summary.spent)} <span className="text-base font-medium text-foreground/45">of {currency(summary.budget)}</span></p>
          </div>
          <p className="text-sm text-foreground/60"><span className="font-semibold text-foreground">{summary.lowCount}</span> items at or below reorder point</p>
        </div>
        <div className="mt-4 h-2 rounded-full bg-surface-muted">
          <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: pct > 90 ? "var(--status-critical)" : pct > 75 ? "var(--status-warning)" : "var(--chart-series-1)" }} />
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-wider text-foreground/45">
                <th className="px-5 py-3 font-semibold">Item</th>
                <th className="px-3 py-3 font-semibold">Stock</th>
                <th className="px-3 py-3 text-right font-semibold">Remaining</th>
                <th className="px-3 py-3 text-right font-semibold">Unit cost</th>
                <th className="px-5 py-3 text-right font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const st = ppeStatus(i);
                const remainingPct = (st.remaining / i.received) * 100;
                const reorderPct = (i.reorderPoint / i.received) * 100;
                return (
                  <tr key={i.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 font-medium">{i.name}</td>
                    <td className="px-3 py-3">
                      <div className="relative h-2 w-48 rounded-full bg-surface-muted">
                        <div className="h-2 rounded-full" style={{ width: `${remainingPct}%`, background: st.low ? "var(--status-warning)" : "var(--chart-series-1)" }} />
                        <span className="absolute -top-0.5 h-3 w-0.5 bg-foreground/40" style={{ left: `${reorderPct}%` }} title="Reorder point" />
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold">{st.remaining}<span className="font-normal text-foreground/40"> / {i.received}</span></td>
                    <td className="px-3 py-3 text-right text-foreground/60">{currency(i.unitCost)}</td>
                    <td className="px-5 py-3 text-right">{st.low ? <span className="badge badge-warning">Reorder</span> : <span className="badge badge-good">In stock</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Equipment() {
  const rows = equipmentSummary();
  const lifts = listInspections().filter((i) => i.templateId === "t_scissor_lift");
  const days = Array.from({ length: 21 }, (_, n) => {
    const d = new Date(nowMs() - (20 - n) * DAY);
    return d.toISOString().slice(0, 10);
  });

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {rows.map(({ asset, last, failed, passRate }) => (
        <section key={asset.id} className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold tracking-tight">{asset.tag}</p>
              <p className="text-xs text-foreground/50">{asset.name} · {getProject(asset.projectId)?.shortName}</p>
            </div>
            <span className={`badge ${failed ? "badge-critical" : "badge-good"}`}>{failed ? "Tag out" : "Cleared"}</span>
          </div>
          <div className="mt-4 flex gap-1">
            {days.map((day) => {
              const log = lifts.filter((l) => l.assetTag === asset.tag && l.date === day);
              const bad = log.some((l) => l.responses.some((r) => r.value === "fail"));
              const bg = log.length === 0 ? "var(--surface-muted)" : bad ? "var(--status-critical)" : "var(--status-good)";
              return <span key={day} title={`${shortDate(day)}: ${log.length === 0 ? "no check" : bad ? "failed" : "passed"}`} className="h-6 flex-1 rounded" style={{ background: bg, opacity: log.length === 0 ? 1 : 0.85 }} />;
            })}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-foreground/55">
            <span>30-day pass rate <span className="font-semibold text-foreground">{passRate}%</span></span>
            {last && (
              <Link href={`/inspections/${last.id}`} className="flex items-center gap-1 font-medium text-sidebar-accent">
                Last check
                <IconArrowRight width={12} height={12} />
              </Link>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

function Notices() {
  const notices = listGcNotices();
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {notices.map((n) => (
        <section key={n.id} className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow">{n.trade} · {getProject(n.projectId)?.shortName}</p>
              <h3 className="mt-1 text-sm font-semibold leading-snug">{n.issue}</h3>
            </div>
            <span className={`badge capitalize ${noticeTone[n.status]}`}>{n.status}</span>
          </div>
          <p className="mt-2 text-sm text-foreground/60">Impact: {n.impact}</p>
          {n.gcResponse && <p className="mt-3 rounded-lg bg-surface-muted p-3 text-sm"><span className="font-medium">GC response:</span> {n.gcResponse}</p>}
          <p className="mt-3 text-xs text-foreground/45">Raised {shortDate(n.raisedAt)} by {getUser(n.raisedById)?.firstName} · {n.priority} priority</p>
        </section>
      ))}
    </div>
  );
}
