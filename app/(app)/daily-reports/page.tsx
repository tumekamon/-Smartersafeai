import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { getUser, listDailyReports } from "@/lib/db";
import { sitesFor } from "@/lib/scope";
import { checkInDay } from "@/lib/check-in";
import { DAILY_REPORT_DUE_HOUR } from "@/lib/daily-report";
import { nowMs } from "@/lib/time";

/** The safety manager reads today's daily site reports (design X05). */
export default async function DailyReportsPage() {
  const user = await getCurrentUser();
  const caps = getCapabilities(user);
  if (!caps.canViewOrgDashboard) redirect("/dashboard");

  const sites = sitesFor(user).filter((s) => s.status === "active");
  const now = nowMs();
  const reports = listDailyReports(user.companyId, { day: checkInDay(now) });
  const late = new Date(now).getHours() >= DAILY_REPORT_DUE_HOUR;
  const inCount = sites.filter((s) => reports.some((r) => r.projectId === s.id)).length;
  const time = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link href="/dashboard" className="inline-flex min-h-11 items-center text-[15px] font-medium text-brand">← Home</Link>
      <div className="flex flex-col gap-2.5">
        <span className="eyebrow">Today · {inCount} of {sites.length} in</span>
        <h1 className="disp text-[34px] leading-none">Daily site reports</h1>
      </div>

      <ul className="flex flex-col gap-4">
        {sites.map((s) => {
          const r = reports.find((x) => x.projectId === s.id);
          if (!r) {
            return (
              <li key={s.id} className="flex items-center justify-between gap-3 border-b border-border py-4">
                <span className="flex flex-col gap-0.5">
                  <span className="font-semibold">{s.shortName}</span>
                  <span className="text-sm text-body">Due 08:00</span>
                </span>
                <span className={`eyebrow rounded px-2 py-1 ${late ? "bg-[#fde8e7] text-status-critical" : "bg-surface-muted"}`}>{late ? "Late" : "Not yet"}</span>
              </li>
            );
          }
          const by = getUser(r.supervisorId);
          return (
            <li key={s.id} className="card flex flex-col gap-3 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[17px] font-semibold">{s.shortName}</span>
                <span className="eyebrow text-status-good">{time(r.submittedAt)}</span>
              </div>
              <span className="text-[13px] text-body">From {by?.firstName} {by?.lastName}</span>
              <div className="grid grid-cols-2 gap-x-6 text-sm sm:grid-cols-4">
                <span className="flex flex-col"><span className="text-body">Crew in</span><span className="font-semibold">{r.snapshot.crewIn} of {r.snapshot.crewTotal}</span></span>
                <span className="flex flex-col"><span className="text-body">Hazards 24h</span><span className="font-semibold">{r.snapshot.hazardsLastDay}</span></span>
                <span className="flex flex-col"><span className="text-body">Open · overdue</span><span className={`font-semibold ${r.snapshot.overdueFixes ? "text-status-critical" : ""}`}>{r.snapshot.openFixes} · {r.snapshot.overdueFixes}</span></span>
                <span className="flex flex-col"><span className="text-body">Permits</span><span className="font-semibold">{r.snapshot.permitsToday.join(", ") || "None"}</span></span>
              </div>
              <div className="flex flex-col gap-1 rounded-lg bg-[#fbf1d9] px-3 py-2.5">
                <span className="eyebrow text-status-warning">High-risk today</span>
                <span className="text-sm leading-relaxed">{r.highRiskWork}</span>
              </div>
              {r.note && <p className="text-sm text-body">{r.note}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
