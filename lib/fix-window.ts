import type { CorrectiveAction, RiskLevel } from "@/lib/types";

/**
 * Fix windows from the design (Assign a fix, S04): the supervisor gives every fix a
 * time window. Escalation follows flow rule 4: the supervisor sees it when the window
 * ends; the safety manager sees it at twice the window. It never goes to the admin.
 */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export const FIX_WINDOWS = [
  { id: "2h", label: "2h", ms: 2 * HOUR },
  { id: "5h", label: "5h", ms: 5 * HOUR },
  { id: "24h", label: "24h", ms: 24 * HOUR },
  { id: "7d", label: "7d", ms: 7 * DAY },
] as const;

export type FixWindowId = (typeof FIX_WINDOWS)[number]["id"];

/** A sensible starting window for each severity; the supervisor can change it. */
export const DEFAULT_WINDOW: Record<RiskLevel, FixWindowId> = {
  critical: "2h",
  high: "5h",
  medium: "24h",
  low: "7d",
};

export function windowById(id: string) {
  return FIX_WINDOWS.find((w) => w.id === id);
}

/** When the fix is due: the exact time if a window was set, else the end of its due day. */
export function dueTime(a: Pick<CorrectiveAction, "dueAt" | "dueDate">): number {
  return a.dueAt ? new Date(a.dueAt).getTime() : new Date(a.dueDate).getTime() + DAY;
}

/** How long the person was given. */
export function windowMs(a: Pick<CorrectiveAction, "dueAt" | "dueDate" | "createdAt">): number {
  return Math.max(HOUR, dueTime(a) - new Date(a.createdAt).getTime());
}

/** Past its window and still not fixed: the supervisor's problem. */
export function isOverdue(a: CorrectiveAction, now = Date.now()) {
  return a.status === "open" && dueTime(a) <= now;
}

/** Past twice its window: now it reaches the safety manager too. */
export function isEscalated(a: CorrectiveAction, now = Date.now()) {
  return a.status === "open" && now - new Date(a.createdAt).getTime() >= 2 * windowMs(a);
}

/** "1h 40m", "3d", for timers in the design. */
export function formatSpan(ms: number) {
  const abs = Math.abs(ms);
  if (abs >= 2 * DAY) return `${Math.floor(abs / DAY)}d`;
  const h = Math.floor(abs / HOUR);
  const m = Math.floor((abs % HOUR) / 60_000);
  return h > 0 ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

/** "1h 40m left" or "6h over". */
export function timeLeftLabel(a: CorrectiveAction, now = Date.now()) {
  const left = dueTime(a) - now;
  return left >= 0 ? `${formatSpan(left)} left` : `${formatSpan(left)} over`;
}
