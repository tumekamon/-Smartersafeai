import type { CorrectiveAction, EvidenceRequirement, RiskLevel, User } from "@/lib/types";
import type { Capabilities } from "@/lib/authz";
import { dueTime, formatSpan } from "@/lib/fix-window";

const DAY = 86_400_000;

/** Descriptions are "What to do — why/detail"; the first part is the task's title. */
export const taskTitle = (a: CorrectiveAction) => a.description.split(" — ")[0];
export const taskDetail = (a: CorrectiveAction) => a.description.split(" — ").slice(1).join(" — ");

/** Where a task came from, in the worker's words. */
export const TASK_SOURCE: Record<CorrectiveAction["source"], { label: string; explain: string }> = {
  finding: { label: "Hazard fix", explain: "A hazard found in an inspection or reported from site, confirmed by safety." },
  infraction: { label: "Equipment check", explain: "An item failed a pre-use equipment check and has to be fixed before use." },
  manual: { label: "Assigned job", explain: "A safety job your supervisor gave you directly." },
};

export const PRIORITY: Record<RiskLevel, { label: string; color: string; within: string }> = {
  critical: { label: "Critical", color: "var(--status-critical)", within: "Fix within 24 hours" },
  high: { label: "High", color: "var(--status-serious)", within: "Fix within 3 days" },
  medium: { label: "Medium", color: "var(--status-warning)", within: "Fix within a week" },
  low: { label: "Low", color: "var(--status-good)", within: "Fix within two weeks" },
};

/** Whole days until the end of the due date (negative = overdue). */
export function daysLeft(a: CorrectiveAction, now: number) {
  return Math.ceil((new Date(a.dueDate).getTime() + DAY - now) / DAY);
}

export function dueLabel(a: CorrectiveAction, now: number): { text: string; tone: "critical" | "warning" | "neutral" } {
  // Fixes given an hour window (2h/5h/24h) count down in hours and minutes.
  if (a.dueAt) {
    const left = dueTime(a) - now;
    if (left < 2 * DAY) {
      return left < 0
        ? { text: `${formatSpan(left)} over`, tone: "critical" }
        : { text: `${formatSpan(left)} left`, tone: left < 3 * 3_600_000 ? "critical" : "warning" };
    }
  }
  const d = daysLeft(a, now);
  if (d < 0) return { text: `${Math.abs(d)}d overdue`, tone: "critical" };
  if (d === 0) return { text: "Due today", tone: "critical" };
  if (d === 1) return { text: "Due tomorrow", tone: "warning" };
  return { text: `Due in ${d}d`, tone: d <= 3 ? "warning" : "neutral" };
}

/** A worker without extra rights only ever sees and acts on their own tasks. */
export const tasksOnly = (user: User, caps: Capabilities) =>
  user.role === "WORKER" && !caps.canVerifyActions && !caps.canReviewFindings;

/**
 * Does marking this task fixed need a photo? A supervisor can set it per task; otherwise
 * physical fixes (hazards, failed equipment) need one and assigned jobs (briefings,
 * paperwork, orders) don't. Without a photo, a note saying what was done is required.
 */
export function photoProof(a: CorrectiveAction): EvidenceRequirement {
  return a.proof ?? (a.source === "manual" ? "optional" : "required");
}

/**
 * The short mono countdown on task rows (design canvas: "1h 40m", "6h over", "3d").
 * Hour windows count down in hours; longer ones in days.
 */
export function countdown(a: CorrectiveAction, now: number): { text: string; tone: "critical" | "warning" | "neutral" } {
  if (a.dueAt) {
    const left = dueTime(a) - now;
    if (Math.abs(left) < 2 * DAY) {
      if (left < 0) return { text: `${formatSpan(left)} over`, tone: "critical" };
      return { text: formatSpan(left), tone: left < 3 * 3_600_000 ? "critical" : "warning" };
    }
  }
  const d = daysLeft(a, now);
  if (d < 0) return { text: `${-d}d over`, tone: "critical" };
  if (d === 0) return { text: "Today", tone: "critical" };
  return { text: `${d}d`, tone: d <= 3 ? "warning" : "neutral" };
}

/** Row dot colour: red for high and critical, amber for medium, blue for low (design canvas). */
export const PRIORITY_DOT: Record<RiskLevel, string> = {
  critical: "var(--status-critical)",
  high: "var(--status-critical)",
  medium: "var(--status-warning)",
  low: "var(--brand)",
};
