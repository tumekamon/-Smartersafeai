"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ModuleId } from "@/lib/home-layout";
import { isNavActive, isPlainWorker, navItemsFor, type NavUser } from "@/components/nav-items";
import { IconPlus, IconX } from "@/components/ui/icons";

/** A worker's four tab screens. Every other worker screen is a step with its own back link and action (design canvas). */
const WORKER_TAB_ROOTS = new Set(["/dashboard", "/corrective-actions", "/my-reports", "/more"]);

/**
 * Phone tab bar (design canvas, every phone screen): two tabs, the yellow Report
 * button in the middle, two tabs. Report goes straight to "Report a hazard" in one tap.
 * When a `menu` is given, the More tab opens it as a sheet from the bottom instead of
 * going to the More page.
 */
export function MobileNav({
  user,
  workBadge,
  canReport,
  hidden = [],
  menu,
  menuBadge = 0,
}: {
  user: NavUser;
  workBadge: number;
  canReport: boolean;
  hidden?: ModuleId[];
  /** Contents of the More sheet (worker menu). */
  menu?: ReactNode;
  /** Dot count on the More tab, e.g. certificates to renew plus unread notifications. */
  menuBadge?: number;
}) {
  const pathname = usePathname();
  const items = navItemsFor(user, hidden);
  const [first, second, ...rest] = items;
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);

  // Close when a link in the sheet navigates.
  const [shownPath, setShownPath] = useState(pathname);
  if (shownPath !== pathname) {
    setShownPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const more = moreRef.current;
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      more?.focus();
    };
  }, [open]);

  if (isPlainWorker(user) && !WORKER_TAB_ROOTS.has(pathname)) return null;

  const tabClass = (active: boolean) =>
    `relative flex min-h-[52px] flex-col items-center justify-center gap-1 text-xs ${active ? "font-semibold text-brand" : "font-medium text-muted"}`;
  const badge = (count: number) =>
    count > 0 && (
      <span className="absolute right-1/2 top-0.5 min-w-[18px] translate-x-[22px] rounded-full bg-status-critical px-1 text-center text-[11px] font-bold leading-[18px] text-white">
        {count}
      </span>
    );

  const tab = (item: (typeof items)[number]) => {
    const active = isNavActive(item, pathname);
    if (menu && item.href === "/more") {
      return (
        <button
          key={item.href}
          ref={moreRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={tabClass(active || open)}
        >
          <item.Icon width={22} height={22} strokeWidth={1.8} />
          Menu
          {badge(menuBadge)}
        </button>
      );
    }
    return (
      <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={tabClass(active)}>
        <item.Icon width={22} height={22} strokeWidth={1.8} />
        {item.label}
        {badge(item.badgeKey === "work" ? workBadge : 0)}
      </Link>
    );
  };

  return (
    <>
      {/* Keeps the end of the page clear of the fixed bar. */}
      <div aria-hidden="true" className="h-24 shrink-0 lg:hidden" />
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-2 pb-[max(env(safe-area-inset-bottom),10px)] pt-1 print:hidden lg:hidden"
      >
        {/* Capped width so the tabs stay within thumb reach on tablets. */}
        <div className="mx-auto grid max-w-xl items-center" style={{ gridTemplateColumns: `repeat(${items.length + (canReport ? 1 : 0)}, minmax(0, 1fr))` }}>
          {first && tab(first)}
          {second && tab(second)}
          {canReport && (
            <Link href="/hazards/new" aria-label="Report a hazard" className="report-pill justify-self-center">
              <IconPlus width={18} height={18} strokeWidth={2.4} />
              Report
            </Link>
          )}
          {rest.map(tab)}
        </div>
      </nav>

      {menu && open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" tabIndex={-1} onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/55 animate-[fade-in_150ms_ease-out]" />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-3xl bg-background shadow-2xl animate-[sheet-up_220ms_cubic-bezier(0.2,0.8,0.2,1)]">
            <div className="flex items-center justify-between px-5 pb-2 pt-3">
              <span aria-hidden="true" className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-foreground/20" />
              <h2 className="disp mt-3 text-[26px] leading-none">Menu</h2>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="mt-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-body hover:text-foreground"
              >
                <IconX width={18} height={18} strokeWidth={2} />
              </button>
            </div>
            <div className="overflow-y-auto px-4 pb-[max(env(safe-area-inset-bottom),20px)] pt-2">{menu}</div>
          </div>
        </div>
      )}
    </>
  );
}
