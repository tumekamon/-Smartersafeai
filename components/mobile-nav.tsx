"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ModuleId } from "@/lib/home-layout";
import { isNavActive, navItemsFor, type NavUser } from "@/components/nav-items";
import { IconPlus } from "@/components/ui/icons";

/**
 * Phone tab bar (design canvas, every phone screen): two tabs, the yellow Report
 * button in the middle, two tabs. Report goes straight to "Report a hazard" in one tap;
 * other quick actions live on the pages that own them (Work, More).
 */
export function MobileNav({
  user,
  workBadge,
  canReport,
  hidden = [],
}: {
  user: NavUser;
  workBadge: number;
  canReport: boolean;
  hidden?: ModuleId[];
}) {
  const pathname = usePathname();
  const items = navItemsFor(user, hidden);
  const [first, second, ...rest] = items;

  const tab = (item: (typeof items)[number]) => {
    const active = isNavActive(item, pathname);
    const count = item.badgeKey === "work" ? workBadge : 0;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`relative flex min-h-[52px] flex-col items-center justify-center gap-1 text-xs ${
          active ? "font-semibold text-brand" : "font-medium text-muted"
        }`}
      >
        <item.Icon width={22} height={22} strokeWidth={1.8} />
        {item.label}
        {count > 0 && (
          <span className="absolute right-1/2 top-0.5 min-w-[18px] translate-x-[22px] rounded-full bg-status-critical px-1 text-center text-[11px] font-bold leading-[18px] text-white">
            {count}
          </span>
        )}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 grid items-center border-t border-border bg-surface px-2 pb-[max(env(safe-area-inset-bottom),10px)] pt-1 print:hidden md:hidden"
      style={{ gridTemplateColumns: `repeat(${items.length + (canReport ? 1 : 0)}, minmax(0, 1fr))` }}
    >
      {first && tab(first)}
      {second && tab(second)}
      {canReport && (
        <Link href="/hazards/new" aria-label="Report a hazard" className="report-pill justify-self-center">
          <IconPlus width={18} height={18} strokeWidth={2.4} />
          Report
        </Link>
      )}
      {rest.map(tab)}
    </nav>
  );
}
