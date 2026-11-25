import type { ComponentType, SVGProps } from "react";
import type { User } from "@/lib/types";
import type { ModuleId } from "@/lib/home-layout";
import { IconCamera, IconClipboardCheck, IconFileCheck, IconHome, IconMapPin, IconMenu, IconUsers } from "@/components/ui/icons";

/**
 * One four-item navigation for every role (Oct 9 review: fewer, combined nav items).
 * "Work" gathers the finding review queue, inspections and corrective actions;
 * "More" gathers projects, incidents and settings. `match` lists the routes that
 * light the item up, so the old URLs keep working under their new home.
 */

export type NavItem = {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  match: string[];
  badgeKey?: "work";
};

export type NavUser = Pick<User, "role" | "readOnly" | "extraPermissions">;

/**
 * A plain worker has no use for Compliance (it's the manager's view of everyone's
 * certificates, permits, stock and notices); their own certificates live under My
 * profile. That slot goes to My reports instead. A worker with the "compliance"
 * extra right keeps Compliance.
 */
export function isPlainWorker(user: NavUser): boolean {
  return user.role === "WORKER" && !user.readOnly && !user.extraPermissions?.includes("compliance");
}

export function navItemsFor(user: NavUser, hidden: ModuleId[] = []): NavItem[] {
  // The owner's tabs (design AP1): Setup · Team · [Report] · Sites · More.
  if (user.role === "ADMIN" && !user.readOnly) {
    return [
      { href: "/dashboard", label: "Setup", Icon: IconHome, match: ["/dashboard"] },
      { href: "/settings/team", label: "Team", Icon: IconUsers, match: ["/settings/team"] },
      { href: "/projects", label: "Sites", Icon: IconMapPin, match: ["/projects"] },
      { href: "/more", label: "More", Icon: IconMenu, match: ["/more", "/settings", "/settings/home", "/settings/profile", "/settings/templates", "/settings/incident-form", "/work", "/review", "/assign", "/inspections", "/corrective-actions", "/compliance", "/incidents", "/reports", "/notifications", "/emergency", "/daily-reports"] },
    ];
  }
  const isWorker = user.role === "WORKER" && !user.readOnly;
  // Labels from the design canvas: Worker "My Day · Tasks", Supervisor "Site · Work".
  const homeLabel = isWorker ? "My Day" : user.role === "SUPERVISOR" ? "Site" : "Home";
  const items: NavItem[] = [
    { href: "/dashboard", label: homeLabel, Icon: IconHome, match: ["/dashboard", "/check-in"] },
    {
      href: "/work",
      label: isWorker ? "Tasks" : "Work",
      Icon: IconClipboardCheck,
      match: ["/work", "/review", "/assign", "/inspections", "/corrective-actions"],
      badgeKey: "work",
    },
    isPlainWorker(user)
      ? { href: "/my-reports", label: "Reports", Icon: IconCamera, match: ["/my-reports", "/hazards"] }
      : { href: "/compliance", label: "Compliance", Icon: IconFileCheck, match: ["/compliance"] },
    { href: "/more", label: "More", Icon: IconMenu, match: ["/more", "/projects", "/incidents", "/settings", "/settings/home", "/settings/profile", "/settings/templates", "/settings/incident-form", "/settings/team", "/reports", "/my-reports", "/notifications", "/emergency"] },
  ];
  // A route owned by a main tab (e.g. a worker's Reports) must not also light up More.
  const owned = new Set(items.slice(0, -1).flatMap((i) => i.match));
  const more = items[items.length - 1];
  more.match = more.match.filter((m) => !owned.has(m));
  return hidden.includes("compliance") ? items.filter((i) => i.href !== "/compliance") : items;
}

export function isNavActive(item: NavItem, pathname: string) {
  // "/settings" alone matches only exactly, so Team (/settings/team) doesn't also light up More.
  return item.match.some((m) => pathname === m || (m !== "/settings" && pathname.startsWith(`${m}/`)));
}
