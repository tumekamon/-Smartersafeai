import "server-only";
import { listProjects } from "@/lib/db";
import type { Project, User } from "@/lib/types";

/**
 * Which sites a person works on. L1/L2 and read-only accounts see every site;
 * supervisors and workers see the projects whose crew they are on. Someone not yet
 * on any crew still sees every site, so a new hire is never locked out of reporting.
 */
export function sitesFor(user: Pick<User, "id" | "companyId" | "role" | "readOnly">): Project[] {
  const all = listProjects(user.companyId);
  if (user.readOnly || user.role === "ADMIN" || user.role === "SAFETY_MANAGER") return all;
  const mine = all.filter((p) => p.crewIds.includes(user.id));
  return mine.length ? mine : all;
}

/** True when this person only works on some of the company's sites. */
export function isSiteScoped(user: Pick<User, "id" | "companyId" | "role" | "readOnly">): boolean {
  return sitesFor(user).length < listProjects(user.companyId).length;
}

export function siteIdsFor(user: Pick<User, "id" | "companyId" | "role" | "readOnly">): Set<string> {
  return new Set(sitesFor(user).map((p) => p.id));
}
