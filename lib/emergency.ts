import "server-only";
import { getUser, listCertifications } from "@/lib/db";
import type { Project, User } from "@/lib/types";

/**
 * People on this site's crew who hold a current, verified First Aid / CPR certificate:
 * who to shout for while help is on the way. Taken from the certificates people
 * upload under My profile, so it stays right without anyone keeping a list.
 */
export function firstAiders(project: Project, now = Date.now()): User[] {
  const today = new Date(now).toISOString().slice(0, 10);
  const holders = new Set(
    listCertifications(project.companyId)
      .filter((c) => c.type === "First Aid / CPR" && c.expiresOn >= today)
      .map((c) => c.userId)
  );
  return project.crewIds
    .filter((id) => holders.has(id))
    .map((id) => getUser(id))
    .filter((u): u is User => !!u && u.active && !u.readOnly)
    .sort((a, b) => Number(!!b.phone) - Number(!!a.phone) || a.firstName.localeCompare(b.firstName));
}

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

export const mapsHref = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
