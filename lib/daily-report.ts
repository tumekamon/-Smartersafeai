import "server-only";
import { listCheckIns, listCorrectiveActions, listDailyReports, listFindings, listPermits } from "@/lib/db";
import { checkInDay } from "@/lib/check-in";
import { isOverdue } from "@/lib/fix-window";
import { permitState } from "@/lib/metrics";
import type { DailyReport, Project } from "@/lib/types";

/** The daily site report is due by 08:00 local time (design S05). */
export const DAILY_REPORT_DUE_HOUR = 8;

/** The numbers a supervisor would otherwise count by hand, taken from today's records. */
export function dailySnapshot(project: Project, now = Date.now()): DailyReport["snapshot"] {
  const day = checkInDay(now);
  const checkedIn = new Set(listCheckIns(project.companyId, { day, projectId: project.id }).map((c) => c.userId));
  const actions = listCorrectiveActions(project.companyId).filter((a) => a.projectId === project.id && a.status === "open");
  const lastDay = now - 86_400_000;
  return {
    crewIn: project.crewIds.filter((id) => checkedIn.has(id)).length,
    crewTotal: project.crewIds.length,
    hazardsLastDay: listFindings(project.companyId).filter((f) => f.projectId === project.id && new Date(f.createdAt).getTime() >= lastDay).length,
    openFixes: actions.length,
    overdueFixes: actions.filter((a) => isOverdue(a, now)).length,
    permitsToday: [
      ...new Set(listPermits(project.companyId).filter((p) => p.projectId === project.id && permitState(p, now) === "active").map((p) => p.type)),
    ],
  };
}

export function todaysReport(project: Project, now = Date.now()): DailyReport | undefined {
  return listDailyReports(project.companyId, { day: checkInDay(now), projectId: project.id })[0];
}

/** Past 08:00 today with no report yet. */
export function isReportLate(project: Project, now = Date.now()) {
  return !todaysReport(project, now) && new Date(now).getHours() >= DAILY_REPORT_DUE_HOUR;
}
