import "server-only";
import {
  getProject,
  getUser,
  listCorrectiveActions,
  listFindings,
  listIncidents,
  listInspections,
} from "@/lib/db";
import { isActionOverdue, passRate, trainingSummary } from "@/lib/metrics";
import { nowMs } from "@/lib/time";
import type { IncidentType, RiskLevel, User } from "@/lib/types";
import { siteIdsFor } from "@/lib/scope";

/**
 * Safety report for one site (or all of a person's sites) over a period (Oct 9 review:
 * "generate report"). Built from the same data as the dashboards, so the numbers match.
 */

const DAY = 86_400_000;
export const REPORT_PERIODS = [7, 30, 90] as const;

const INCIDENT_LABEL: Record<IncidentType, string> = {
  near_miss: "Near miss",
  first_aid: "First aid",
  recordable: "Recordable",
  property_damage: "Property damage",
  illness: "Illness",
};

export function buildReport(user: User, projectId: string | undefined, days: number) {
  const now = nowMs();
  const from = now - days * DAY;
  const sites = siteIdsFor(user);
  const inScope = (pid: string) => sites.has(pid) && (!projectId || pid === projectId);
  const inPeriod = (iso?: string) => !!iso && new Date(iso).getTime() >= from;

  const inspections = listInspections(user.companyId).filter((i) => inScope(i.projectId) && inPeriod(i.submittedAt));
  const findings = listFindings(user.companyId).filter((f) => inScope(f.projectId) && inPeriod(f.createdAt));
  const actions = listCorrectiveActions(user.companyId).filter((a) => inScope(a.projectId));
  const incidents = listIncidents(user.companyId).filter((i) => inScope(i.projectId) && inPeriod(i.reportedAt));

  const byRisk = (["critical", "high", "medium", "low"] as RiskLevel[]).map((r) => ({
    risk: r,
    count: findings.filter((f) => f.riskLevel === r).length,
  }));
  const categories = Object.entries(
    findings.reduce<Record<string, number>>((acc, f) => ({ ...acc, [f.hazardCategory]: (acc[f.hazardCategory] ?? 0) + 1 }), {})
  )
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const openHighRisk = actions
    .filter((a) => a.status === "open" && (a.priority === "high" || a.priority === "critical"))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .map((a) => ({
      action: a,
      site: getProject(a.projectId)?.shortName ?? "",
      owner: getUser(a.assignedToId),
      overdue: isActionOverdue(a, now),
    }));

  const training = trainingSummary(user.companyId);

  return {
    days,
    from: new Date(from).toISOString(),
    to: new Date(now).toISOString(),
    site: projectId ? getProject(projectId) : undefined,
    totals: {
      inspections: inspections.length,
      passRate: inspections.length ? Math.round(inspections.reduce((s, i) => s + passRate(i), 0) / inspections.length) : 100,
      findings: findings.length,
      siteReports: findings.filter((f) => f.source === "field").length,
      actionsClosed: actions.filter((a) => inPeriod(a.closedAt ?? a.verifiedAt)).length,
      actionsOpen: actions.filter((a) => a.status === "open").length,
      overdue: actions.filter((a) => isActionOverdue(a, now)).length,
      incidents: incidents.length,
      recordables: incidents.filter((i) => i.oshaRecordable).length,
      lostTimeDays: incidents.reduce((s, i) => s + i.lostTimeDays, 0),
      trainingValid: Math.round(training.compliantPercent),
    },
    byRisk,
    categories,
    incidentsByType: (Object.keys(INCIDENT_LABEL) as IncidentType[])
      .map((t) => ({ type: INCIDENT_LABEL[t], count: incidents.filter((i) => i.type === t).length }))
      .filter((x) => x.count > 0),
    openHighRisk,
    incidents: incidents.map((i) => ({ incident: i, site: getProject(i.projectId)?.shortName ?? "", type: INCIDENT_LABEL[i.type] })),
    findings: findings.map((f) => ({ finding: f, site: getProject(f.projectId)?.shortName ?? "" })),
  };
}

export type Report = ReturnType<typeof buildReport>;

const csvCell = (v: unknown) => {
  const s = String(v ?? "");
  // Prefix formula-looking cells so a spreadsheet never runs them.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function reportCsv(report: Report): string {
  const rows: unknown[][] = [["Record", "Date", "Site", "Location", "Category / type", "Risk", "Status", "Detail"]];
  for (const { finding: f, site } of report.findings) {
    rows.push(["Finding", f.createdAt.slice(0, 10), site, `${f.location.level} ${f.location.zone}`, f.hazardCategory, f.riskLevel, f.reviewerDecision, f.title]);
  }
  for (const { action: a, site } of report.openHighRisk) {
    rows.push(["Open high-risk fix", a.dueDate, site, a.location ? `${a.location.level} ${a.location.zone}` : "", a.category, a.priority, a.status, a.description]);
  }
  for (const { incident: i, site, type } of report.incidents) {
    rows.push(["Incident", i.reportedAt.slice(0, 10), site, `${i.location.level} ${i.location.zone}`, type, i.oshaRecordable ? "recordable" : "", i.status, i.description]);
  }
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}
