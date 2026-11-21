import "server-only";
import { getUser, listPermits, listUsers } from "@/lib/db";
import type { Permit, Project, User } from "@/lib/types";

export type SiteContact = { user: User; role: "Supervisor" | "Safety manager" };

/**
 * Who a worker on this site reports to: the supervisors on the site's crew. If the
 * site has none yet, fall back to the company's safety managers so there is always
 * someone to call.
 */
export function siteContacts(project: Project): SiteContact[] {
  const supervisors = project.crewIds
    .map((id) => getUser(id))
    .filter((u): u is User => !!u && u.active && !u.readOnly && u.role === "SUPERVISOR");
  if (supervisors.length) return supervisors.map((user) => ({ user, role: "Supervisor" }));
  return listUsers(project.companyId)
    .filter((u) => u.active && !u.readOnly && u.role === "SAFETY_MANAGER")
    .map((user) => ({ user, role: "Safety manager" }));
}

/** Permits in force on the site right now, soonest to expire first. */
export function activePermits(project: Project, now: number): Permit[] {
  return listPermits(project.companyId)
    .filter(
      (p) =>
        p.projectId === project.id &&
        !p.closedAt &&
        new Date(p.startsAt).getTime() <= now &&
        new Date(p.expiresAt).getTime() > now
    )
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
}

/** "B1 – L5" style summary of a site's levels. */
export function levelRange(project: Project): string {
  const { levels } = project;
  if (levels.length <= 1) return levels[0] ?? "";
  return `${levels[0]} – ${levels[levels.length - 1]}`;
}
