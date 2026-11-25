"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { switchSiteAction } from "@/lib/actions/site";
import { IconCheck, IconMapPin } from "@/components/ui/icons";

type SiteOption = { id: string; shortName: string; location: string; openTasks: number };

/**
 * The worker's working site, always in the top bar. With more than one site it opens a
 * menu to switch; the whole app then shows only the chosen site. Staying on the same
 * page after switching, except a site page, which moves to the new site.
 */
export function SiteSwitcher({ sites, currentId }: { sites: SiteOption[]; currentId: string }) {
  const [open, setOpen] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  // Close and clear the spinner once the new site has loaded.
  const [shownId, setShownId] = useState(currentId);
  if (shownId !== currentId) {
    setShownId(currentId);
    setOpen(false);
    setSwitchingTo(null);
  }
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const search = useSearchParams();
  const current = sites.find((s) => s.id === currentId) ?? sites[0];
  const canSwitch = sites.length > 1;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!current) return null;

  // Where to land after switching: same page, minus any per-site filter in the URL.
  const redirectFor = (siteId: string) => {
    const onSitePage = pathname.match(/^\/projects\/[^/]+(\/.*)?$/);
    if (onSitePage) return `/projects/${siteId}${onSitePage[1] ?? ""}`;
    const params = new URLSearchParams(search.toString());
    params.delete("project");
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const chip = (
    <>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand">
        <IconMapPin width={15} height={15} strokeWidth={2} />
      </span>
      <span className="min-w-0 text-left">
        <span className="hidden text-[10px] font-semibold uppercase leading-none tracking-wider text-foreground/50 sm:block">Working site</span>
        <span className="block truncate text-[13px] font-bold leading-tight sm:mt-0.5 lg:max-w-[14rem]">{current.shortName}</span>
      </span>
    </>
  );

  if (!canSwitch) {
    return <div className="flex min-h-10 min-w-0 items-center gap-2 rounded-xl px-2 py-1">{chip}</div>;
  }

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex min-h-10 min-w-0 max-w-full items-center gap-2 rounded-xl border border-border/60 bg-surface/60 py-1 pl-1.5 pr-3 transition-colors hover:bg-surface-muted"
      >
        {chip}
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={`ml-1 shrink-0 text-foreground/50 transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        >
          <p className="border-b border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/50">Switch site</p>
          <ul className="p-1.5">
            {sites.map((s) => {
              const on = s.id === current.id;
              return (
                <li key={s.id}>
                  {/* Keep the menu open until the switch lands: closing it here would unmount the form mid-submit. */}
                  <form action={switchSiteAction} onSubmit={() => setSwitchingTo(s.id)}>
                    <input type="hidden" name="projectId" value={s.id} />
                    <input type="hidden" name="redirectTo" value={redirectFor(s.id)} />
                    <button
                      type="submit"
                      role="menuitemradio"
                      aria-checked={on}
                      disabled={on || switchingTo !== null}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${on ? "bg-surface-muted" : "hover:bg-surface-muted"}`}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${on ? "bg-brand text-white" : "bg-surface-muted text-foreground/60"}`}>
                        {switchingTo === s.id ? (
                          <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : on ? (
                          <IconCheck width={17} height={17} strokeWidth={2.6} />
                        ) : (
                          <IconMapPin width={16} height={16} />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{s.shortName}</span>
                        <span className="block truncate text-xs text-foreground/55">{s.location}</span>
                      </span>
                      {switchingTo === s.id ? (
                        <span className="shrink-0 text-xs font-medium text-foreground/55">Switching…</span>
                      ) : s.openTasks > 0 && (
                        <span className="badge badge-warning shrink-0" title={`${s.openTasks} open tasks`}>
                          {s.openTasks} {s.openTasks === 1 ? "task" : "tasks"}
                        </span>
                      )}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
