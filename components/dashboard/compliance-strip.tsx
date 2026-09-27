import Link from "next/link";
import { equipmentSummary, permitSummary, ppeStatus, ppeSummary, trainingSummary } from "@/lib/metrics";
import { currency } from "@/lib/format";
import { Donut } from "@/components/viz/donut";
import { IconArrowRight } from "@/components/ui/icons";

function Panel({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="card group flex flex-col p-5 transition-all hover:shadow-lg hover:-translate-y-1">
      <div className="mb-3 flex items-center justify-between">
        <p className="eyebrow">{title}</p>
        <IconArrowRight width={14} height={14} className="text-foreground/25 transition-transform group-hover:translate-x-0.5" />
      </div>
      {children}
    </Link>
  );
}

export function ComplianceStrip({ companyId }: { companyId: string }) {
  const training = trainingSummary(companyId);
  const permits = permitSummary(companyId);
  const ppe = ppeSummary(companyId);
  const equipment = equipmentSummary(companyId);
  const lowTop = ppe.low.slice(0, 3);
  const budgetPct = Math.min(100, Math.round((ppe.spent / ppe.budget) * 100));

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Panel title="Training & certification" href="/compliance?tab=training">
        <div className="flex items-center gap-4">
          <Donut
            size={96}
            stroke={12}
            center={`${Math.round(training.compliantPercent)}%`}
            caption="valid"
            segments={[
              { label: "Current", value: training.current, color: "var(--status-good)" },
              { label: "Expiring in 30 days", value: training.expiring, color: "var(--status-warning)" },
              { label: "Expired", value: training.expired, color: "var(--status-critical)" },
            ]}
          />
          <ul className="space-y-1.5 text-xs">
            <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: "var(--status-good)" }} />{training.current} current</li>
            <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: "var(--status-warning)" }} />{training.expiring} expiring</li>
            <li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: "var(--status-critical)" }} />{training.expired} expired</li>
          </ul>
        </div>
      </Panel>

      <Panel title="Permits" href="/compliance?tab=permits">
        <p className="text-4xl font-semibold leading-none tracking-tight">{permits.active}</p>
        <p className="mt-1 text-xs text-foreground/55">active on site right now</p>
        <div className="mt-4 flex gap-4 text-xs">
          <span>
            <span className={`font-semibold ${permits.expiredOpen ? "tone-serious" : ""}`}>{permits.expiredOpen}</span>{" "}
            <span className="text-foreground/55">expired, not closed</span>
          </span>
          <span>
            <span className="font-semibold">{permits.last30}</span> <span className="text-foreground/55">last 30 days</span>
          </span>
        </div>
      </Panel>

      <Panel title="PPE inventory" href="/compliance?tab=ppe">
        <p className="text-4xl font-semibold leading-none tracking-tight">
          {ppe.lowCount}
          <span className="ml-1.5 text-sm font-medium text-foreground/50">items low</span>
        </p>
        <ul className="mt-3 space-y-1 text-xs text-foreground/65">
          {lowTop.map((i) => (
            <li key={i.id} className="flex justify-between gap-2">
              <span className="truncate">{i.name}</span>
              <span className="font-semibold tone-warning">{ppeStatus(i).remaining} left</span>
            </li>
          ))}
        </ul>
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[11px] text-foreground/50">
            <span>Budget used</span>
            <span>{currency(ppe.spent)} of {currency(ppe.budget)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-muted">
            <div className="h-1.5 rounded-full" style={{ width: `${budgetPct}%`, background: "var(--chart-series-1)" }} />
          </div>
        </div>
      </Panel>

      <Panel title="Lift & equipment" href="/compliance?tab=equipment">
        <ul className="space-y-2.5">
          {equipment.map((row) => (
            <li key={row.asset.id} className="flex items-center gap-3 text-xs">
              <span className="w-11 font-semibold">{row.asset.tag}</span>
              <span className="h-1.5 flex-1 rounded-full bg-surface-muted">
                <span
                  className="block h-1.5 rounded-full"
                  style={{ width: `${row.passRate}%`, background: row.passRate >= 90 ? "var(--status-good)" : row.passRate >= 80 ? "var(--status-warning)" : "var(--status-critical)" }}
                />
              </span>
              <span className="w-9 text-right text-foreground/60">{row.passRate}%</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-foreground/45">30-day pre-use inspection pass rate</p>
      </Panel>
    </div>
  );
}
