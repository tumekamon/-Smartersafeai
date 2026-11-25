"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ModuleId } from "@/lib/home-layout";
import { isNavActive, navItemsFor, type NavUser } from "@/components/nav-items";

/** Desktop tabs inside the navy top bar (replaces the old sidebar). Same items as the phone tab bar. */
export function TopNav({ user, hidden = [], workBadge }: { user: NavUser; hidden?: ModuleId[]; workBadge: number }) {
  const pathname = usePathname();
  const items = navItemsFor(user, hidden);

  return (
    <nav aria-label="Main" className="hidden items-center gap-5 lg:flex xl:gap-7">
      {items.map((item) => {
        const active = isNavActive(item, pathname);
        const count = item.badgeKey === "work" ? workBadge : 0;
        return (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className="top-tab">
            {item.label}
            {count > 0 && (
              <span className="rounded-full bg-status-critical px-1.5 text-[11px] font-bold leading-[18px] text-white">{count}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
