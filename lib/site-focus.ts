import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { getCheckInForDay, listUsers } from "@/lib/db";
import { checkInDay } from "@/lib/check-in";
import { sitesFor, worksOnSite } from "@/lib/scope";
import type { Project, User } from "@/lib/types";

/**
 * A worker on more than one site works on one of them at a time. The site they've
 * switched to is their "working site", and every worker screen (My Day, My Tasks,
 * incidents, compliance, report forms) shows only that site.
 *
 * This is a view filter, not access control: access stays with lib/scope.ts, so a
 * worker can still open and switch to any site they're crewed on.
 */

export const SITE_COOKIE = "smartsafe_site";

type Who = Pick<User, "id" | "companyId" | "role" | "readOnly">;

/** Workers get one working site at a time; everyone else keeps their full set of sites. */
export function usesWorkingSite(user: Pick<User, "role" | "readOnly">): boolean {
  return !user.readOnly && user.role === "WORKER";
}

/** The worker's active sites they can switch between. */
export function switchableSites(user: Who): Project[] {
  return sitesFor(user).filter((p) => p.status === "active");
}

/**
 * The site a worker is working on: the one they switched to, else where they checked
 * in today, else their first active site. Undefined when they're on no active site.
 */
export const workingSite = cache(async (user: Who): Promise<Project | undefined> => {
  const sites = switchableSites(user);
  if (sites.length === 0) return undefined;
  const chosen = (await cookies()).get(SITE_COOKIE)?.value;
  const checkedIn = getCheckInForDay(user.companyId, user.id, checkInDay(Date.now()))?.projectId;
  return sites.find((s) => s.id === chosen) ?? sites.find((s) => s.id === checkedIn) ?? sites[0];
});

/** Sites a screen should show: just the working site for a worker, all their sites otherwise. */
export async function workingSites(user: Who): Promise<Project[]> {
  if (!usesWorkingSite(user)) return sitesFor(user);
  const site = await workingSite(user);
  return site ? [site] : [];
}

export async function workingSiteIds(user: Who): Promise<Set<string>> {
  return new Set((await workingSites(user)).map((p) => p.id));
}

/** People on the working site(s): who can be named in a report or picked in a form. */
export async function workingPeople(user: Who): Promise<User[]> {
  const sites = await workingSites(user);
  return listUsers(user.companyId).filter((u) => u.active && !u.readOnly && sites.some((p) => worksOnSite(u, p)));
}
