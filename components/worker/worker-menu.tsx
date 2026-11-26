import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import type { Project, User } from "@/lib/types";
import type { Theme } from "@/lib/theme";
import { roleLabel } from "@/lib/roles";
import { logout } from "@/lib/actions/auth";
import { switchSiteAction } from "@/lib/actions/site";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  IconAlertTriangle,
  IconBell,
  IconCheck,
  IconChevronRight,
  IconFileCheck,
  IconFileText,
  IconLogout,
  IconMapPin,
  IconSettings,
  IconSiren,
  IconUser,
} from "@/components/ui/icons";

export type WorkerMenuData = {
  user: Pick<User, "firstName" | "lastName" | "title" | "role" | "readOnly">;
  site?: Pick<Project, "id" | "shortName">;
  sites: Pick<Project, "id" | "shortName" | "location">[];
  certsDue: number;
  unread: number;
  incidents: boolean;
  theme: Theme;
};

type Tile = { href: string; label: string; meta: string; Icon: ComponentType<SVGProps<SVGSVGElement>>; badge?: number; tone?: string };

/**
 * Everything that isn't on the four tabs, in one menu (phone: a sheet from the More tab;
 * desktop: the More page). Who you are, shortcuts as tiles, Emergency, the working site,
 * then settings and sign out.
 */
export function WorkerMenu({ data, variant }: { data: WorkerMenuData; variant: "sheet" | "page" }) {
  const { user, site, sites, certsDue, unread, incidents, theme } = data;
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`;

  const tiles: Tile[] = [
    ...(site
      ? [
          { href: `/projects/${site.id}/inspections/new`, label: "Checklists", meta: "Run today's checks", Icon: IconFileText },
          { href: `/projects/${site.id}`, label: "Site details", meta: "Levels, crew, permits", Icon: IconMapPin },
        ]
      : []),
    {
      href: "/settings/profile#certs",
      label: "Certificates",
      meta: certsDue ? `${certsDue} need renewing` : "All current",
      Icon: IconFileCheck,
      badge: certsDue,
      tone: certsDue ? "var(--status-warning)" : undefined,
    },
    { href: "/notifications", label: "Notifications", meta: unread ? `${unread} new` : "All caught up", Icon: IconBell, badge: unread },
    ...(incidents
      ? [
          { href: "/incidents/new", label: "Report incident", meta: "Injury, near miss, damage", Icon: IconAlertTriangle },
          { href: "/incidents", label: "Incident log", meta: "What's been reported", Icon: IconFileText },
        ]
      : []),
  ];

  const page = variant === "page";
  const row = "flex min-h-14 items-center gap-3 px-4 text-[15px] transition-colors hover:bg-surface-muted";

  return (
    <div className={`flex flex-col ${page ? "gap-6" : "gap-5"}`}>
      {/* Who you are */}
      <Link href="/settings/profile" className="wk-card group flex items-center gap-4 p-4">
        <span className="disp flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#0F4C81] text-xl text-white">{initials}</span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-lg font-semibold">
            {user.firstName} {user.lastName}
          </span>
          <span className="truncate text-[13px] text-body">{[user.title, roleLabel(user)].filter(Boolean).join(" · ")}</span>
          <span className="mt-0.5 text-[13px] font-semibold text-brand group-hover:underline">View and edit profile</span>
        </span>
        <IconChevronRight width={18} height={18} className="shrink-0 text-muted" />
      </Link>

      <Link href="/emergency" className="flex min-h-14 items-center gap-3 rounded-2xl bg-[#B42318] px-4 text-white">
        <IconSiren width={22} height={22} strokeWidth={1.9} />
        <span className="flex-1 text-base font-semibold">Emergency</span>
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#FDE8E7]">911 · muster · ER</span>
      </Link>

      {/* Shortcuts */}
      <section aria-label="Shortcuts" className={`grid gap-3 ${page ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2"}`}>
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="wk-card relative flex min-h-[7.5rem] flex-col justify-between gap-3 p-4 transition-colors hover:border-brand/40">
            <span className="wk-icon" style={t.tone ? { color: t.tone, background: `color-mix(in srgb, ${t.tone} 13%, var(--surface))` } : undefined}>
              <t.Icon width={19} height={19} strokeWidth={1.9} />
            </span>
            {!!t.badge && (
              <span className="absolute right-3 top-3 min-w-5 rounded-full bg-status-critical px-1.5 text-center text-[11px] font-semibold leading-5 text-white">{t.badge}</span>
            )}
            <span className="flex flex-col">
              <span className="text-[15px] font-semibold leading-tight">{t.label}</span>
              <span className="text-[13px] text-body">{t.meta}</span>
            </span>
          </Link>
        ))}
      </section>

      {/* Working site */}
      {sites.length > 0 && (
        <section aria-labelledby="menu-site" className="wk-card overflow-hidden">
          <h2 id="menu-site" className="border-b border-border px-4 py-3 font-mono text-[11px] uppercase tracking-[0.08em] text-body">
            Working site
          </h2>
          <ul className="divide-y divide-border">
            {sites.map((s) => {
              const on = s.id === site?.id;
              return (
                <li key={s.id}>
                  <form action={switchSiteAction}>
                    <input type="hidden" name="projectId" value={s.id} />
                    <input type="hidden" name="redirectTo" value="/dashboard" />
                    <button type="submit" disabled={on} className={`${row} w-full text-left disabled:hover:bg-transparent`}>
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${on ? "bg-brand text-surface" : "bg-surface-muted text-body"}`}>
                        {on ? <IconCheck width={16} height={16} strokeWidth={2.6} /> : <IconMapPin width={16} height={16} />}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-medium">{s.shortName}</span>
                        <span className="truncate text-[13px] text-body">{s.location}</span>
                      </span>
                      {on ? <span className="ds-tag ds-tag-info">Current</span> : <span className="text-sm font-semibold text-brand">Switch</span>}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Settings */}
      <section aria-labelledby="menu-settings" className="wk-card overflow-hidden">
        <h2 id="menu-settings" className="border-b border-border px-4 py-3 font-mono text-[11px] uppercase tracking-[0.08em] text-body">
          Settings
        </h2>
        <ul className="divide-y divide-border">
          <li>
            <Link href="/settings/profile" className={row}>
              <IconUser width={18} height={18} className="text-body" />
              <span className="flex-1">Profile and password</span>
              <IconChevronRight width={16} height={16} className="text-muted" />
            </Link>
          </li>
          <li className={`${row} hover:bg-transparent`}>
            <IconSettings width={18} height={18} className="text-body" />
            <span className="flex-1">Appearance</span>
            <ThemeToggle theme={theme} />
          </li>
          <li>
            <form action={logout}>
              <button type="submit" className={`${row} w-full text-left tone-critical`}>
                <IconLogout width={18} height={18} />
                <span className="flex-1">Sign out</span>
              </button>
            </form>
          </li>
        </ul>
      </section>
    </div>
  );
}
