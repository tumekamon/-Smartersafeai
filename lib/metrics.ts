import "server-only";
import {
  getProject,
  getTemplate,
  getUser,
  listAssets,
  listCertifications,
  listCorrectiveActions,
  listFindings,
  listGcNotices,
  listInspections,
  listPermits,
  listPpeItems,
  listProjects,
} from "@/lib/db";
import type {
  CorrectiveAction,
  Finding,
  HazardCategory,
  Inspection,
  Permit,
  Project,
  RiskLevel,
} from "@/lib/types";

const DAY = 86_400_000;

const t = (iso: string) => new Date(iso).getTime();

export function isActionOverdue(action: CorrectiveAction, now = Date.now()) {
  return action.status === "open" && t(action.dueDate) + DAY <= now;
}

function inScope<T extends { projectId: string }>(items: T[], projectId?: string) {
  return projectId ? items.filter((i) => i.projectId === projectId) : items;
}

function mondayOf(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - ((day + 6) % 7));
  return d.getTime();
}

export type WeekPoint = {
  weekStart: number;
  label: string;
  raised: number;
  closed: number;
  inspections: number;
};

export function weeklySeries(companyId: string, projectId?: string, weeks = 12): WeekPoint[] {
  const now = Date.now();
  const thisWeek = mondayOf(now);
  const points: WeekPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = thisWeek - i * 7 * DAY;
    points.push({
      weekStart: start,
      label: new Date(start).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      raised: 0,
      closed: 0,
      inspections: 0,
    });
  }
  const bucket = (ms: number) => points.find((p) => ms >= p.weekStart && ms < p.weekStart + 7 * DAY);
  for (const f of inScope(listFindings(companyId), projectId)) {
    const b = bucket(t(f.createdAt));
    if (b) b.raised += 1;
  }
  for (const a of inScope(listCorrectiveActions(companyId), projectId)) {
    if (a.closedAt) {
      const b = bucket(t(a.closedAt));
      if (b) b.closed += 1;
    } else if (a.verifiedAt) {
      const b = bucket(t(a.verifiedAt));
      if (b) b.closed += 1;
    }
  }
  for (const i of inScope(listInspections(companyId), projectId)) {
    const b = bucket(t(i.submittedAt));
    if (b) b.inspections += 1;
  }
  return points;
}

export type ScoreBreakdown = {
  score: number;
  inspections: number;
  actions: number;
  training: number;
  trend: number;
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function safetyScore(companyId: string, projectId?: string): ScoreBreakdown {
  const now = Date.now();
  const cutoff = now - 30 * DAY;
  const recentInspections = inScope(listInspections(companyId), projectId).filter((i) => t(i.submittedAt) >= cutoff);
  let items = 0;
  let passed = 0;
  for (const i of recentInspections) {
    for (const r of i.responses) {
      if (r.value === "na") continue;
      items += 1;
      if (r.value === "pass") passed += 1;
    }
  }
  const passRatePct = items ? (passed / items) * 100 : 100;
  const inspectionScore = clamp((passRatePct - 70) * 3.6);

  const actions = inScope(listCorrectiveActions(companyId), projectId).filter((a) => t(a.createdAt) >= now - 60 * DAY);
  const overdue = actions.filter((a) => isActionOverdue(a, now)).length;
  const closed = actions.filter((a) => a.status === "closed" || a.status === "verified").length;
  const actionScore = actions.length ? clamp(100 - (overdue / actions.length) * 240 + (closed / actions.length) * 8) : 100;

  const tr = trainingSummary(companyId, projectId);
  const trainingScore = tr.total ? clamp(100 - (tr.expired / tr.total) * 100 * 3 - (tr.expiring / tr.total) * 100 * 0.5) : 100;

  const series = weeklySeries(companyId, projectId, 8);
  const recent = series.slice(-4).reduce((s, p) => s + p.raised, 0);
  const prior = series.slice(0, 4).reduce((s, p) => s + p.raised, 0);
  const trendScore = prior === 0 ? 85 : clamp(85 - ((recent - prior) / prior) * 55);

  const score = clamp(inspectionScore * 0.4 + actionScore * 0.25 + trainingScore * 0.2 + trendScore * 0.15);
  return {
    score,
    inspections: clamp(inspectionScore),
    actions: clamp(actionScore),
    training: clamp(trainingScore),
    trend: clamp(trendScore),
  };
}

export function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 85) return "low";
  if (score >= 72) return "medium";
  if (score >= 58) return "high";
  return "critical";
}

export type HeatCell = { level: string; zone: string; count: number; critical: number };

export function heatmap(companyId: string, projectId: string, days = 30): { levels: string[]; zones: string[]; cells: HeatCell[]; max: number } {
  const project = getProject(projectId);
  if (!project) return { levels: [], zones: [], cells: [], max: 0 };
  const cutoff = Date.now() - days * DAY;
  const findings = listFindings(companyId).filter((f) => f.projectId === projectId && t(f.createdAt) >= cutoff && f.reviewerDecision !== "rejected");
  const cells: HeatCell[] = [];
  let max = 0;
  for (const level of project.levels) {
    for (const zone of project.zones) {
      const inCell = findings.filter((f) => f.location.level === level && f.location.zone === zone);
      const count = inCell.length;
      max = Math.max(max, count);
      cells.push({ level, zone, count, critical: inCell.filter((f) => f.riskLevel === "critical" || f.riskLevel === "high").length });
    }
  }
  return { levels: [...project.levels].reverse(), zones: project.zones, cells, max };
}

export function hazardBreakdown(companyId: string, projectId?: string, days = 30) {
  const cutoff = Date.now() - days * DAY;
  const counts = new Map<HazardCategory, number>();
  for (const f of inScope(listFindings(companyId), projectId)) {
    if (t(f.createdAt) < cutoff || f.reviewerDecision === "rejected") continue;
    counts.set(f.hazardCategory, (counts.get(f.hazardCategory) ?? 0) + 1);
  }
  return [...counts.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
}

export function closureStats(companyId: string, projectId?: string) {
  const done = inScope(listCorrectiveActions(companyId), projectId).filter((a) => a.closedAt || a.verifiedAt);
  if (!done.length) return { avgDays: 0, onTimePercent: 100, count: 0 };
  let total = 0;
  let onTime = 0;
  for (const a of done) {
    const end = t((a.verifiedAt ?? a.closedAt)!);
    total += (end - t(a.createdAt)) / DAY;
    if (end <= t(a.dueDate) + DAY) onTime += 1;
  }
  return { avgDays: total / done.length, onTimePercent: Math.round((onTime / done.length) * 100), count: done.length };
}

// --- Compliance -------------------------------------------------------------

export type CertStatus = "current" | "expiring" | "expired";

export function certStatus(expiresOn: string, now = Date.now()): CertStatus {
  const exp = t(expiresOn);
  if (exp < now) return "expired";
  if (exp < now + 30 * DAY) return "expiring";
  return "current";
}

export function trainingSummary(companyId: string, projectId?: string) {
  void projectId;
  const certs = listCertifications(companyId);
  const now = Date.now();
  let current = 0;
  let expiring = 0;
  let expired = 0;
  for (const c of certs) {
    const s = certStatus(c.expiresOn, now);
    if (s === "current") current += 1;
    else if (s === "expiring") expiring += 1;
    else expired += 1;
  }
  const total = certs.length || 1;
  return { current, expiring, expired, total: certs.length, compliantPercent: ((current + expiring) / total) * 100 };
}

export function permitState(p: Permit, now = Date.now()): "active" | "closed" | "expired" | "upcoming" {
  if (p.closedAt) return "closed";
  if (t(p.startsAt) > now) return "upcoming";
  if (t(p.expiresAt) < now) return "expired";
  return "active";
}

export function permitSummary(companyId: string) {
  const permits = listPermits(companyId);
  const now = Date.now();
  return {
    active: permits.filter((p) => permitState(p, now) === "active").length,
    expiredOpen: permits.filter((p) => permitState(p, now) === "expired").length,
    last30: permits.filter((p) => t(p.startsAt) >= now - 30 * DAY).length,
  };
}

export function ppeStatus(item: { received: number; issued: number; reorderPoint: number }) {
  const remaining = item.received - item.issued;
  return { remaining, low: remaining <= item.reorderPoint };
}

export function ppeSummary(companyId: string) {
  const items = listPpeItems(companyId);
  const low = items.filter((i) => ppeStatus(i).low);
  const spent = items.reduce((s, i) => s + i.received * i.unitCost, 0);
  return { low, lowCount: low.length, spent, budget: 52_000 };
}

export function equipmentSummary(companyId: string) {
  const assets = listAssets(companyId);
  const lifts = listInspections(companyId).filter((i) => i.templateId === "t_scissor_lift");
  const rows = assets.map((a) => {
    const logs = lifts.filter((i) => i.assetTag === a.tag);
    const last = logs[0];
    const failed = last ? last.responses.some((r) => r.value === "fail") : false;
    const recent = logs.filter((l) => t(l.submittedAt) >= Date.now() - 30 * DAY);
    const passRate = recent.length ? Math.round((recent.filter((l) => !l.responses.some((r) => r.value === "fail")).length / recent.length) * 100) : 100;
    return { asset: a, last, failed, passRate, checks: recent.length };
  });
  return rows;
}

// --- Attention & activity ---------------------------------------------------

export type AttentionItem = {
  id: string;
  kind: "review" | "overdue" | "permit" | "cert" | "notice";
  title: string;
  detail: string;
  href: string;
  tone: "critical" | "serious" | "warning" | "info";
  at: number;
};

export function attentionQueue(companyId: string, limit = 8, projectId?: string): AttentionItem[] {
  const now = Date.now();
  const items: AttentionItem[] = [];

  for (const f of inScope(listFindings(companyId), projectId)) {
    if (f.reviewerDecision !== "pending") continue;
    const project = getProject(f.projectId);
    items.push({
      id: `review_${f.id}`,
      kind: "review",
      title: `Review AI finding: ${f.title}`,
      detail: `${project?.shortName} · ${f.location.level} ${f.location.zone} · ${Math.round(f.aiConfidence * 100)}% confidence`,
      href: `/review?finding=${f.id}`,
      tone: f.riskLevel === "critical" ? "critical" : f.riskLevel === "high" ? "serious" : "warning",
      at: t(f.createdAt),
    });
  }

  for (const a of inScope(listCorrectiveActions(companyId), projectId)) {
    if (!isActionOverdue(a, now)) continue;
    const days = Math.max(1, Math.floor((now - t(a.dueDate)) / DAY));
    const owner = getUser(a.assignedToId);
    items.push({
      id: `overdue_${a.id}`,
      kind: "overdue",
      title: a.description.split(" — ")[0],
      detail: `${getProject(a.projectId)?.shortName}${a.location ? ` · ${a.location.level} ${a.location.zone}` : ""} · ${days} day${days === 1 ? "" : "s"} overdue · ${owner?.firstName} ${owner?.lastName}`,
      href: "/corrective-actions",
      tone: a.priority === "critical" || a.priority === "high" ? "critical" : "serious",
      at: t(a.dueDate),
    });
  }

  for (const p of inScope(listPermits(companyId), projectId)) {
    if (permitState(p, now) !== "expired") continue;
    const project = getProject(p.projectId);
    items.push({
      id: `permit_${p.id}`,
      kind: "permit",
      title: `${p.type} permit expired without close-out`,
      detail: `${project?.shortName} · ${p.location.level} ${p.location.zone}`,
      href: "/compliance?tab=permits",
      tone: "serious",
      at: t(p.expiresAt),
    });
  }

  for (const g of inScope(listGcNotices(companyId), projectId)) {
    if (g.status !== "open" || g.priority !== "high") continue;
    const project = getProject(g.projectId);
    items.push({
      id: `notice_${g.id}`,
      kind: "notice",
      title: `${g.trade}: ${g.issue}`,
      detail: `${project?.shortName} · awaiting GC response`,
      href: `/projects/${g.projectId}`,
      tone: "warning",
      at: t(g.raisedAt),
    });
  }

  const soon = listCertifications(companyId).filter((c) => certStatus(c.expiresOn, now) === "expiring");
  if (soon.length && !projectId) {
    items.push({
      id: "certs_soon",
      kind: "cert",
      title: `${soon.length} certifications expire within 30 days`,
      detail: "Schedule renewals before crews are pulled from the schedule",
      href: "/compliance?tab=training",
      tone: "warning",
      at: now - 1,
    });
  }

  const weight = { critical: 4, serious: 3, warning: 2, info: 1 };
  const caps: Record<AttentionItem["kind"], number> = { review: 3, overdue: 3, permit: 1, cert: 1, notice: 1 };
  const seen: Record<string, number> = {};
  return items
    .sort((a, b) => weight[b.tone] - weight[a.tone] || b.at - a.at)
    .filter((item) => {
      seen[item.kind] = (seen[item.kind] ?? 0) + 1;
      return seen[item.kind] <= caps[item.kind];
    })
    .slice(0, limit);
}

export type ActivityEvent = {
  id: string;
  at: number;
  actor: string;
  verb: string;
  subject: string;
  href: string;
  kind: "inspection" | "ai" | "review" | "action" | "permit" | "notice";
};

const fullName = (id?: string) => {
  const u = id ? getUser(id) : undefined;
  return u ? `${u.firstName} ${u.lastName}` : "Unknown";
};

export function activityFeed(companyId: string, limit = 12, projectId?: string): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  const cutoff = Date.now() - 4 * DAY;

  for (const i of inScope(listInspections(companyId), projectId)) {
    if (t(i.submittedAt) < cutoff) continue;
    const template = getTemplate(i.templateId);
    const project = getProject(i.projectId);
    events.push({ id: `i_${i.id}`, at: t(i.submittedAt), actor: fullName(i.inspectorId), verb: "submitted", subject: `${template?.name} · ${project?.shortName}`, href: `/inspections/${i.id}`, kind: "inspection" });
  }
  for (const f of inScope(listFindings(companyId), projectId)) {
    if (t(f.createdAt) >= cutoff) {
      events.push({ id: `fa_${f.id}`, at: t(f.createdAt), actor: "SmartSafe AI", verb: "flagged", subject: `${f.title} · ${f.location.level} ${f.location.zone}`, href: `/inspections/${f.inspectionId}`, kind: "ai" });
    }
    if (f.reviewedAt && t(f.reviewedAt) >= cutoff) {
      events.push({ id: `fr_${f.id}`, at: t(f.reviewedAt), actor: fullName(f.reviewerId), verb: f.reviewerDecision === "rejected" ? "rejected" : f.reviewerDecision === "overridden" ? "overrode" : "approved", subject: f.title, href: `/inspections/${f.inspectionId}`, kind: "review" });
    }
  }
  for (const a of inScope(listCorrectiveActions(companyId), projectId)) {
    const stamp = a.closedAt ?? a.verifiedAt ?? a.completedAt;
    if (stamp && t(stamp) >= cutoff) {
      events.push({ id: `ca_${a.id}`, at: t(stamp), actor: fullName(a.assignedToId), verb: a.closedAt ? "closed" : a.verifiedAt ? "verified" : "completed", subject: a.description.split(" — ")[0], href: "/corrective-actions", kind: "action" });
    }
  }
  for (const p of inScope(listPermits(companyId), projectId)) {
    if (t(p.startsAt) >= cutoff && t(p.startsAt) <= Date.now()) {
      events.push({ id: `p_${p.id}`, at: t(p.startsAt), actor: fullName(p.issuedById), verb: "issued", subject: `${p.type} permit · ${p.location.level} ${p.location.zone}`, href: "/compliance?tab=permits", kind: "permit" });
    }
  }
  return events.sort((a, b) => b.at - a.at).slice(0, limit);
}

// --- Insights ---------------------------------------------------------------

export type Insight = {
  id: string;
  headline: string;
  detail: string;
  metric: string;
  tone: "critical" | "serious" | "warning" | "good" | "info";
  href?: string;
};

export function insights(companyId: string, projectId?: string): Insight[] {
  const now = Date.now();
  const out: Insight[] = [];
  const findings = inScope(listFindings(companyId), projectId).filter((f) => f.reviewerDecision !== "rejected");

  // Recurring hazard cluster
  const cluster = new Map<string, Finding[]>();
  for (const f of findings) {
    if (t(f.createdAt) < now - 21 * DAY) continue;
    const key = `${f.projectId}|${f.location.level}|${f.location.zone}|${f.hazardCategory}`;
    cluster.set(key, [...(cluster.get(key) ?? []), f]);
  }
  const top = [...cluster.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  if (top && top[1].length >= 3) {
    const [pid, level, zone, category] = top[0].split("|");
    const prior = findings.filter(
      (f) => f.projectId === pid && f.location.level === level && f.location.zone === zone && f.hazardCategory === category && t(f.createdAt) < now - 21 * DAY && t(f.createdAt) >= now - 42 * DAY
    ).length;
    out.push({
      id: "cluster",
      headline: `${category} findings are clustering on ${level} ${zone}`,
      detail: `${top[1].length} findings in 3 weeks at ${getProject(pid)?.shortName}, versus ${prior} in the 3 weeks before. A targeted walk-through and crew briefing is recommended.`,
      metric: `${top[1].length} in 21 days`,
      tone: "critical",
      href: `/projects/${pid}`,
    });
  }

  // Trend
  const series = weeklySeries(companyId, projectId, 8);
  const recent = series.slice(-4).reduce((s, p) => s + p.raised, 0);
  const prior = series.slice(0, 4).reduce((s, p) => s + p.raised, 0);
  if (prior > 0) {
    const change = Math.round(((recent - prior) / prior) * 100);
    out.push({
      id: "trend",
      headline: change <= 0 ? `Findings are down ${Math.abs(change)}% over the last 4 weeks` : `Findings are up ${change}% over the last 4 weeks`,
      detail: `${recent} raised in the last 4 weeks versus ${prior} in the 4 weeks before.`,
      metric: `${change > 0 ? "+" : ""}${change}%`,
      tone: change <= -10 ? "good" : change >= 15 ? "serious" : "info",
    });
  }

  // Closure speed by project
  if (!projectId) {
    const stats = listProjects(companyId).map((p) => ({ p, s: closureStats(companyId, p.id) })).filter((x) => x.s.count > 3);
    if (stats.length > 1) {
      const slowest = [...stats].sort((a, b) => b.s.avgDays - a.s.avgDays)[0];
      const fastest = [...stats].sort((a, b) => a.s.avgDays - b.s.avgDays)[0];
      if (slowest.p.id !== fastest.p.id && slowest.s.avgDays > fastest.s.avgDays * 1.15) {
        out.push({
          id: "closure",
          headline: `${slowest.p.shortName} takes ${(slowest.s.avgDays / fastest.s.avgDays).toFixed(1)}x longer to close actions`,
          detail: `${slowest.s.avgDays.toFixed(1)} days on average, versus ${fastest.s.avgDays.toFixed(1)} days at ${fastest.p.shortName}.`,
          metric: `${slowest.s.avgDays.toFixed(1)} days avg`,
          tone: "warning",
          href: `/projects/${slowest.p.id}`,
        });
      }
    }
  }

  // Certifications
  const soon = listCertifications(companyId).filter((c) => certStatus(c.expiresOn, now) === "expiring");
  if (soon.length && !projectId) {
    const byType = new Map<string, number>();
    for (const c of soon) byType.set(c.type, (byType.get(c.type) ?? 0) + 1);
    const [type, n] = [...byType.entries()].sort((a, b) => b[1] - a[1])[0];
    out.push({
      id: "certs",
      headline: `${soon.length} certifications expire within 30 days`,
      detail: `${type} is the largest group (${n}). Renewals booked now avoid pulling crews off the schedule.`,
      metric: `${soon.length} expiring`,
      tone: "warning",
      href: "/compliance?tab=training",
    });
  }

  // Inspection coverage gap
  if (!projectId) {
    for (const p of listProjects(companyId)) {
      const last = inScope(listInspections(companyId), p.id)[0];
      if (last && now - t(last.submittedAt) > 2 * DAY) {
        out.push({
          id: `gap_${p.id}`,
          headline: `No inspections logged at ${p.shortName} in ${Math.floor((now - t(last.submittedAt)) / DAY)} days`,
          detail: "Coverage has a gap. Confirm the site is active and assign a walk-through.",
          metric: "coverage gap",
          tone: "serious",
          href: `/projects/${p.id}`,
        });
      }
    }
  }

  return out.slice(0, 3);
}

// --- Project health ---------------------------------------------------------

export function projectHealth(project: Project) {
  const breakdown = safetyScore(project.companyId, project.id);
  const actions = listCorrectiveActions(project.companyId).filter((a) => a.projectId === project.id);
  const inspections = listInspections(project.companyId).filter((i) => i.projectId === project.id);
  const lastInspection = inspections[0] as Inspection | undefined;
  return {
    ...breakdown,
    level: riskLevelFromScore(breakdown.score),
    openActions: actions.filter((a) => a.status === "open").length,
    overdue: actions.filter((a) => isActionOverdue(a)).length,
    pendingReviews: listFindings(project.companyId).filter((f) => f.projectId === project.id && f.reviewerDecision === "pending").length,
    inspections30: inspections.filter((i) => t(i.submittedAt) >= Date.now() - 30 * DAY).length,
    lastInspection,
  };
}

export function passRate(inspection: Inspection) {
  const scored = inspection.responses.filter((r) => r.value !== "na");
  if (!scored.length) return 100;
  return Math.round((scored.filter((r) => r.value === "pass").length / scored.length) * 100);
}


export type Hotspot = {
  project: Project;
  level: string;
  zone: string;
  count: number;
  high: number;
  dominant: HazardCategory;
};

export function hotspots(companyId: string, projectId?: string, limit = 4, days = 30): Hotspot[] {
  const cutoff = Date.now() - days * DAY;
  const groups = new Map<string, Finding[]>();
  for (const f of inScope(listFindings(companyId), projectId)) {
    if (t(f.createdAt) < cutoff || f.reviewerDecision === "rejected") continue;
    const key = `${f.projectId}|${f.location.level}|${f.location.zone}`;
    groups.set(key, [...(groups.get(key) ?? []), f]);
  }
  const out: Hotspot[] = [];
  for (const [key, list] of groups) {
    const [pid, level, zone] = key.split("|");
    const project = getProject(pid);
    if (!project) continue;
    const byCat = new Map<HazardCategory, number>();
    for (const f of list) byCat.set(f.hazardCategory, (byCat.get(f.hazardCategory) ?? 0) + 1);
    const dominant = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0][0];
    out.push({ project, level, zone, count: list.length, high: list.filter((f) => f.riskLevel === "high" || f.riskLevel === "critical").length, dominant });
  }
  return out.sort((a, b) => b.count - a.count).slice(0, limit);
}
