import Link from "next/link";
import { Suspense, type ComponentProps } from "react";
import { roleLabel } from "@/lib/roles";
import { logout } from "@/lib/actions/auth";
import { getTheme } from "@/lib/theme";
import type { User } from "@/lib/types";
import type { ModuleId } from "@/lib/home-layout";
import { ThemeToggle } from "@/components/theme-toggle";
import { SiteSwitcher } from "@/components/site/site-switcher";
import { NotificationBell } from "@/components/notifications/bell";
import { TopNav } from "@/components/top-nav";
import { BrandLockup, BrandMark } from "@/components/ui/brand-mark";
import { IconLogout, IconPlus } from "@/components/ui/icons";
import type { NavUser } from "@/components/nav-items";

/**
 * The navy top bar on every screen (design canvas: "navy top bar like a site office board").
 * Desktop: logo, the main tabs, the yellow Report button, then the person.
 * Phone: logo mark, working site and bell; the tabs live in the bottom bar.
 */
export async function Topbar({
  user,
  navUser,
  hidden,
  workBadge,
  canReport,
  siteSwitch,
  unread,
}: {
  user: User;
  navUser: NavUser;
  hidden: ModuleId[];
  workBadge: number;
  canReport: boolean;
  /** A worker's working site and the sites they can switch to. */
  siteSwitch?: ComponentProps<typeof SiteSwitcher>;
  /** Workers only: new notifications since they last looked. */
  unread?: number;
}) {
  const theme = await getTheme();
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`;

  return (
    <header className="navy-scope sticky top-0 z-40 print:hidden">
      <div className="mx-auto flex min-h-16 max-w-[1280px] items-center gap-4 px-4 md:gap-8 md:px-8">
        <Link href="/dashboard" aria-label="SmartSafe home" className="flex shrink-0 items-center">
          <span className="md:hidden"><BrandMark size={32} /></span>
          <BrandLockup className="hidden md:inline-flex" />
        </Link>

        <TopNav user={navUser} hidden={hidden} workBadge={workBadge} />

        {siteSwitch && (
          <div className="min-w-0">
            <Suspense fallback={null}>
              <SiteSwitcher {...siteSwitch} />
            </Suspense>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2 md:gap-3">
          {canReport && (
            <Link href="/hazards/new" className="report-pill hidden md:inline-flex">
              <IconPlus width={18} height={18} strokeWidth={2.4} />
              Report
            </Link>
          )}
          <div className={siteSwitch ? "hidden sm:block" : undefined}>
            <ThemeToggle theme={theme} />
          </div>
          {unread !== undefined && <NotificationBell unread={unread} />}
          <Link href="/settings/profile" className="flex items-center gap-2.5" title={`${user.firstName} ${user.lastName} · ${roleLabel(user)}`}>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-tint text-sm font-semibold text-ink">{initials}</span>
            <span className="hidden text-left lg:block">
              <span className="block text-[13px] font-semibold leading-tight">{user.firstName} {user.lastName}</span>
              <span className="block font-mono text-[10px] uppercase tracking-wider text-[#c9daec]">{roleLabel(user)}</span>
            </span>
          </Link>
          {/* On phones, sign out lives on the More page. */}
          <form action={logout} className="hidden md:block">
            <button
              type="submit"
              aria-label="Sign out"
              title="Sign out"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-[#c9daec] hover:text-white"
            >
              <IconLogout width={16} height={16} />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
