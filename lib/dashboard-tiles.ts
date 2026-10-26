import "server-only";
import {
  closureStats,
  isActionOverdue,
  passRate,
  trainingSummary,
  weeklySeries,
} from "@/lib/metrics";
import { listCorrectiveActions, listFindings, listIncidents, listInspections } from "@/lib/db";
import { nowMs } from "@/lib/time";
import type { ModuleId } from "@/lib/home-layout";

/**
 * Home-screen number tiles a manager can pick from (Oct 9 review: "if I don't want
 * to see inspections per week, can I replace it with something different?").
 * `alert` tiles turn red when their value is above zero, so trouble reads at a glance.
 */

const DAY = 86_400_000;

export type TileId =
  | "pending_reviews"
  | "overdue_actions"
  | "high_risk_open"
  | "findings_week"
  | "inspections_week"
  | "open_actions"
  | "avg_days_close"
  | "pass_rate_week"
  | "certs_expiring"
  | "open_incidents";

export type TileDef = { id: TileId; label: string; alert?: boolean; module?: ModuleId };

export const TILE_CATALOG: TileDef[] = [
  { id: "pending_reviews", label: "AI findings to review", alert: true },
  { id: "overdue_actions", label: "Overdue fixes", alert: true },
  { id: "high_risk_open", label: "High-risk open", alert: true },
  { id: "findings_week", label: "Findings this week" },
  { id: "inspections_week", label: "Inspections this week" },
  { id: "open_actions", label: "Open actions" },
  { id: "avg_days_close", label: "Avg. days to close" },
  { id: "pass_rate_week", label: "Pass rate this week" },
  { id: "certs_expiring", label: "Certs expiring / expired", alert: true, module: "compliance" },
  { id: "open_incidents", label: "Open incidents", alert: true, module: "incidents" },
];

export const DEFAULT_TILES: TileId[] = [
  "pending_reviews",
  "overdue_actions",
  "findings_week",
  "inspections_week",
  "open_actions",
  "avg_days_close",
];

export const MAX_TILES = 8;

export function isTileId(id: string): id is TileId {
  return TILE_CATALOG.some((t) => t.id === id);
}

export function tilesFor(saved: string[] | undefined): TileDef[] {
  const ids = saved?.filter(isTileId) ?? [];
  const chosen = ids.length ? ids : DEFAULT_TILES;
  return chosen.map((id) => TILE_CATALOG.find((t) => t.id === id)!);
}

export type TileValue = { value: string | number; raw: number; series?: number[]; href?: string };

export function tileValue(id: TileId, companyId: string, projectId?: string): TileValue {
  const inProject = <T extends { projectId: string }>(xs: T[]) => (projectId ? xs.filter((x) => x.projectId === projectId) : xs);
  const now = nowMs();
  const q = projectId ? `project=${projectId}` : "";

  switch (id) {
    case "pending_reviews": {
      const n = inProject(listFindings(companyId)).filter((f) => f.reviewerDecision === "pending").length;
      return { value: n, raw: n, href: "/review" };
    }
    case "overdue_actions": {
      const n = inProject(listCorrectiveActions(companyId)).filter((a) => isActionOverdue(a, now)).length;
      return { value: n, raw: n, href: `/corrective-actions?view=overdue${q ? `&${q}` : ""}` };
    }
    case "high_risk_open": {
      const n = inProject(listCorrectiveActions(companyId)).filter(
        (a) => a.status === "open" && (a.priority === "high" || a.priority === "critical")
      ).length;
      return { value: n, raw: n, href: `/corrective-actions${q ? `?${q}` : ""}` };
    }
    case "findings_week": {
      const s = weeklySeries(companyId, projectId, 12);
      const n = s[s.length - 1].raised;
      return { value: n, raw: n, series: s.map((p) => p.raised) };
    }
    case "inspections_week": {
      const s = weeklySeries(companyId, projectId, 12);
      const n = s[s.length - 1].inspections;
      return { value: n, raw: n, series: s.map((p) => p.inspections), href: "/inspections" };
    }
    case "open_actions": {
      const n = inProject(listCorrectiveActions(companyId)).filter((a) => a.status === "open").length;
      return { value: n, raw: n, href: `/corrective-actions${q ? `?${q}` : ""}` };
    }
    case "avg_days_close": {
      const d = closureStats(companyId, projectId).avgDays;
      return { value: d.toFixed(1), raw: d };
    }
    case "pass_rate_week": {
      const week = inProject(listInspections(companyId)).filter((i) => new Date(i.submittedAt).getTime() >= now - 7 * DAY);
      const rate = week.length ? Math.round(week.reduce((sum, i) => sum + passRate(i), 0) / week.length) : 100;
      return { value: `${rate}%`, raw: rate, href: "/inspections" };
    }
    case "certs_expiring": {
      const t = trainingSummary(companyId, projectId);
      const n = t.expiring + t.expired;
      return { value: n, raw: n, href: "/compliance?tab=training" };
    }
    case "open_incidents": {
      const n = inProject(listIncidents(companyId)).filter((i) => i.status !== "closed").length;
      return { value: n, raw: n, href: "/incidents" };
    }
  }
}
