import type { ComponentType, SVGProps } from "react";
import type { User } from "@/lib/types";
import type { ModuleId } from "@/lib/home-layout";
import { IconClipboardCheck, IconFileCheck, IconHome, IconMenu } from "@/components/ui/icons";

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

export function navItemsFor(user: Pick<User, "role" | "readOnly">, hidden: ModuleId[] = []): NavItem[] {
  const isWorker = user.role === "WORKER" && !user.readOnly;
  const items: NavItem[] = [
    { href: "/dashboard", label: isWorker ? "My Day" : "Home", Icon: IconHome, match: ["/dashboard"] },
    {
      href: "/work",
      label: isWorker ? "My Tasks" : "Work",
      Icon: IconClipboardCheck,
      match: ["/work", "/review", "/inspections", "/corrective-actions"],
      badgeKey: "work",
    },
    { href: "/compliance", label: "Compliance", Icon: IconFileCheck, match: ["/compliance"] },
    { href: "/more", label: "More", Icon: IconMenu, match: ["/more", "/projects", "/incidents", "/settings"] },
  ];
  return hidden.includes("compliance") ? items.filter((i) => i.href !== "/compliance") : items;
}

export function isNavActive(item: NavItem, pathname: string) {
  return item.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
}
