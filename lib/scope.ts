import "server-only";
import { getProject, listProjects, listUsers } from "@/lib/db";
import type { Project, User } from "@/lib/types";

type Who = Pick<User, "id" | "companyId" | "role" | "readOnly">;

/**
 * Which sites a person works on. This is the single access rule for project data:
 *
 * - L1 Admin, L2 Safety Manager and read-only client accounts see every site of
 *   their own company.
 * - L3 Supervisors and L4 Workers see only the sites whose crew they are on. Someone
 *   on no crew sees no sites at all: they must not learn which other projects exist.
 *
 * Nobody ever sees another company's projects; every list is scoped by companyId.
 */
export function sitesFor(user: Who): Project[] {
  const all = listProjects(user.companyId);
  if (seesAllSites(user)) return all;
  return all.filter((p) => p.crewIds.includes(user.id));
}

/** L1/L2 and read-only accounts cover the whole company; L3/L4 only their crews' sites. */
export function seesAllSites(user: Pick<User, "role" | "readOnly">): boolean {
  return user.readOnly === true || user.role === "ADMIN" || user.role === "SAFETY_MANAGER";
}

/** True when this person only works on some of the company's sites. */
export function isSiteScoped(user: Who): boolean {
  return !seesAllSites(user);
}

export function siteIdsFor(user: Who): Set<string> {
  return new Set(sitesFor(user).map((p) => p.id));
}

/**
 * The project, if this person may see it; otherwise undefined. Use it for every
 * project id that comes from a URL or a form, and treat undefined as "not found"
 * so the answer never reveals that the project exists.
 */
export function accessibleProject(user: Who, projectId: string | null | undefined): Project | undefined {
  if (!projectId) return undefined;
  const project = getProject(projectId);
  if (!project || project.companyId !== user.companyId) return undefined;
  if (!seesAllSites(user) && !project.crewIds.includes(user.id)) return undefined;
  return project;
}

/** Whether a person can be given work on a site: on its crew, or an L1/L2 who covers every site. */
export function worksOnSite(person: Pick<User, "id" | "companyId" | "role" | "readOnly" | "active">, project: Project): boolean {
  if (!person.active || person.readOnly || person.companyId !== project.companyId) return false;
  return person.role === "ADMIN" || person.role === "SAFETY_MANAGER" || project.crewIds.includes(person.id);
}

/**
 * People this person can see and pick in forms: everyone in the company for L1/L2,
 * otherwise the crews of their own sites (plus the L1/L2 staff who cover every site).
 */
export function peopleFor(user: Who): User[] {
  const everyone = listUsers(user.companyId).filter((u) => u.active && !u.readOnly);
  if (seesAllSites(user)) return everyone;
  const sites = sitesFor(user);
  return everyone.filter((u) => sites.some((p) => worksOnSite(u, p)));
}
