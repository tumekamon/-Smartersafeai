"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@/lib/types";
import type { ModuleId } from "@/lib/home-layout";
import { isNavActive, navItemsFor } from "@/components/nav-items";
import { IconAlertTriangle, IconArrowRight, IconBolt, IconClipboardCheck, IconFileCheck, IconPlus, IconWrench, IconX } from "@/components/ui/icons";

export type QuickActionFlags = {
  canInspect: boolean;
  canReportIncident: boolean;
  canCreateAction: boolean;
  canManageCompliance: boolean;
};

/**
 * Phone navigation for people on site: a bottom bar with large targets and a
 * centre ＋ that opens the field actions in one tap, instead of a hamburger menu.
 */
export function MobileNav({
  user,
  workBadge,
  projects,
  flags,
  hidden = [],
}: {
  user: Pick<User, "role" | "readOnly">;
  workBadge: number;
  projects: { id: string; shortName: string }[];
  flags: QuickActionFlags;
  hidden?: ModuleId[];
}) {
  const pathname = usePathname();
  const [sheet, setSheet] = useState<"closed" | "actions" | "pickProject">("closed");
  const items = navItemsFor(user, hidden);
  const hasActions = flags.canInspect || flags.canReportIncident || flags.canCreateAction || flags.canManageCompliance;

  useEffect(() => {
    if (sheet === "closed") return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheet("closed");
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet]);

  const close = () => setSheet("closed");
  const [first, second, ...rest] = items;

  const tab = (item: (typeof items)[number]) => {
    const active = isNavActive(item, pathname);
    const count = item.badgeKey === "work" ? workBadge : 0;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`relative flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
          active ? "text-brand" : "text-foreground/60"
        }`}
      >
        <item.Icon width={24} height={24} strokeWidth={2} />
        {item.label}
        {count > 0 && (
          <span className="absolute right-1/2 top-1 translate-x-[22px] min-w-[18px] rounded-full bg-status-critical px-1 text-center text-[11px] font-bold leading-[18px] text-white">
            {count}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 grid print:hidden border-t border-border bg-surface/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-1 backdrop-blur-xl md:hidden"
        style={{ gridTemplateColumns: `repeat(${items.length + (hasActions ? 1 : 0)}, minmax(0, 1fr))` }}
      >
        {tab(first)}
        {tab(second)}
        {hasActions && (
          <button
            type="button"
            aria-label="New report"
            aria-expanded={sheet !== "closed"}
            onClick={() => setSheet("actions")}
            className="mx-auto -mt-7 flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/30"
          >
            <IconPlus width={30} height={30} strokeWidth={2.4} />
          </button>
        )}
        {rest.map(tab)}
      </nav>

      {sheet !== "closed" && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden" role="dialog" aria-modal="true" aria-label="Quick actions">
          <button type="button" aria-label="Close" onClick={close} className="absolute inset-0 bg-black/45" />
          <div className="relative rounded-t-3xl bg-surface px-5 pb-[max(env(safe-area-inset-bottom),24px)] pt-3 shadow-2xl">
            <span className="mx-auto mb-3 block h-1.5 w-11 rounded-full bg-border" />
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-extrabold">{sheet === "pickProject" ? "Which site?" : "What do you need?"}</h2>
              <button type="button" aria-label="Close" onClick={close} className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted">
                <IconX width={20} height={20} strokeWidth={2.2} />
              </button>
            </div>

            {sheet === "pickProject" ? (
              <div className="flex flex-col gap-2.5">
                {projects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}/inspections/new`}
                    onClick={close}
                    className="flex min-h-16 items-center justify-between rounded-2xl bg-surface-muted px-5 text-base font-bold"
                  >
                    {p.shortName}
                    <IconArrowRight width={20} height={20} />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {flags.canInspect && (
                  <Link href="/hazards/new" onClick={close} className="quick-action bg-[#c2410c]">
                    <QuickIcon><IconAlertTriangle width={32} height={32} strokeWidth={2} /></QuickIcon>
                    <QuickText title="Report hazard" sub="Snap a photo · 3 taps" />
                  </Link>
                )}
                {flags.canInspect && projects.length > 0 && (
                  projects.length === 1 ? (
                    <Link href={`/projects/${projects[0].id}/inspections/new`} onClick={close} className="quick-action bg-brand">
                      <QuickIcon><IconClipboardCheck width={32} height={32} strokeWidth={2} /></QuickIcon>
                      <QuickText title="Start inspection" sub="Checklist + photos · AI checks them" />
                    </Link>
                  ) : (
                    <button type="button" onClick={() => setSheet("pickProject")} className="quick-action bg-brand text-left">
                      <QuickIcon><IconClipboardCheck width={32} height={32} strokeWidth={2} /></QuickIcon>
                      <QuickText title="Start inspection" sub="Checklist + photos · AI checks them" />
                    </button>
                  )
                )}
                {flags.canReportIncident && (
                  <Link href="/incidents/new" onClick={close} className="quick-action bg-[#12161f]">
                    <QuickIcon><IconBolt width={32} height={32} strokeWidth={2} /></QuickIcon>
                    <QuickText title="Report incident" sub="Injury, near miss or damage" />
                  </Link>
                )}
                {(flags.canCreateAction || flags.canManageCompliance) && (
                  <div className="grid grid-cols-2 gap-2.5">
                    {flags.canCreateAction && (
                      <Link href="/corrective-actions/new" onClick={close} className="flex min-h-16 items-center justify-center gap-2 rounded-2xl bg-surface-muted text-[15px] font-bold">
                        <IconWrench width={20} height={20} strokeWidth={2} />
                        Assign a fix
                      </Link>
                    )}
                    {flags.canManageCompliance && (
                      <Link href="/compliance/permits/new" onClick={close} className="flex min-h-16 items-center justify-center gap-2 rounded-2xl bg-surface-muted text-[15px] font-bold">
                        <IconFileCheck width={20} height={20} strokeWidth={2} />
                        Issue permit
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function QuickIcon({ children }: { children: React.ReactNode }) {
  return <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20">{children}</span>;
}

function QuickText({ title, sub }: { title: string; sub: string }) {
  return (
    <span className="flex flex-col gap-1">
      <span className="text-xl font-extrabold">{title}</span>
      <span className="text-sm opacity-90">{sub}</span>
    </span>
  );
}
