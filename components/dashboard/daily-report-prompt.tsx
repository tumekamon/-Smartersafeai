import Link from "next/link";
import { getCapabilities } from "@/lib/authz";
import { listDailyReports } from "@/lib/db";
import { sitesFor } from "@/lib/scope";
import { checkInDay } from "@/lib/check-in";
import { todaysReport } from "@/lib/daily-report";
import { nowMs } from "@/lib/time";
import type { Project, User } from "@/lib/types";

/**
 * Daily site report on Home (design S01 / MP1):
 * - a supervisor sees "Send daily site report · due 08:00" until today's is sent;
 * - the safety manager sees how many of today's reports are in.
 */
export function DailyReportPrompt({ user, project }: { user: User; project?: Project }) {
  const caps = getCapabilities(user);
  if (caps.isReadOnly) return null;

  if (user.role === "SUPERVISOR" || (!caps.canReviewFindings && caps.canVerifyActions)) {
    const site = project ?? sitesFor(user)[0];
    if (!site) return null;
    const sent = todaysReport(site);
    if (sent) {
      return (
        <Link href={`/daily-report?project=${site.id}`} className="flex min-h-12 items-center justify-between rounded-xl border border-border bg-surface px-4 text-sm">
          <span>Daily report for {site.shortName} sent</span>
          <span className="eyebrow text-status-good">Update</span>
        </Link>
      );
    }
    return (
      <Link href={`/daily-report?project=${site.id}`} className="flex items-center gap-3 rounded-xl bg-ink px-5 py-4 text-white">
        <span className="flex flex-1 flex-col gap-1">
          <span className="eyebrow" style={{ color: "var(--hivis)" }}>Due 08:00</span>
          <span className="text-base font-semibold">Send daily site report</span>
        </span>
        <span aria-hidden="true" className="text-xl">→</span>
      </Link>
    );
  }

  if (caps.canReviewFindings) {
    const sites = sitesFor(user).filter((s) => s.status === "active");
    if (sites.length === 0) return null;
    const reports = listDailyReports(user.companyId, { day: checkInDay(nowMs()) });
    const inCount = sites.filter((s) => reports.some((r) => r.projectId === s.id)).length;
    const missing = sites.filter((s) => !reports.some((r) => r.projectId === s.id)).map((s) => s.shortName);
    return (
      <Link href="/daily-reports" className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3">
        <span className="flex flex-col gap-0.5">
          <span className="font-semibold">Daily site reports: {inCount} of {sites.length} in</span>
          {missing.length > 0 && <span className="text-sm text-body">Not sent yet: {missing.join(", ")}</span>}
        </span>
        <span className="eyebrow text-brand">Read →</span>
      </Link>
    );
  }
  return null;
}
