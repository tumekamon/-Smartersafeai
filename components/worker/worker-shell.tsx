import Link from "next/link";
import { Suspense, type ComponentProps, type ReactNode } from "react";
import type { User } from "@/lib/types";
import type { ModuleId } from "@/lib/home-layout";
import { roleLabel } from "@/lib/roles";
import { getTheme } from "@/lib/theme";
import { WorkerSidebar } from "@/components/worker/worker-sidebar";
import { SiteSwitcher } from "@/components/site/site-switcher";
import { NotificationBell } from "@/components/notifications/bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "@/components/mobile-nav";
import { WorkerMenu, type WorkerMenuData } from "@/components/worker/worker-menu";
import { IconPlus } from "@/components/ui/icons";
import type { NavUser } from "@/components/nav-items";

/**
 * The worker's app frame.
 * - Large screens: a navy sidebar with the menu, and a white header with the working
 *   site, theme, notifications and the yellow Report button.
 * - Phones and tablets: no top bar (each screen has its own header) and the bottom tab bar.
 */
export async function WorkerShell({
  user,
  navUser,
  hidden,
  siteSwitch,
  siteId,
  taskBadge,
  unread,
  certsDue,
  children,
  extras,
  menu,
}: {
  user: User;
  navUser: NavUser;
  hidden: ModuleId[];
  siteSwitch?: ComponentProps<typeof SiteSwitcher>;
  siteId?: string;
  taskBadge: number;
  unread: number;
  certsDue: number;
  children: ReactNode;
  /** Offline sync and anything else that floats over the page. */
  extras?: ReactNode;
  /** What the phone menu (More tab) and the More page list. */
  menu: Omit<WorkerMenuData, "theme" | "user" | "certsDue" | "unread">;
}) {
  const theme = await getTheme();
  return (
    <div className="flex min-h-screen w-full flex-col bg-background lg:pl-64">
      <WorkerSidebar
        siteId={siteId}
        taskBadge={taskBadge}
        unread={unread}
        certsDue={certsDue}
        incidents={menu.incidents}
        person={{
          name: `${user.firstName} ${user.lastName}`,
          initials: `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`,
          role: roleLabel(user),
        }}
      />

      <header className="sticky top-0 z-30 hidden h-16 shrink-0 items-center gap-4 border-b border-border bg-surface/90 px-8 backdrop-blur print:hidden lg:flex">
        {siteSwitch && (
          <Suspense fallback={null}>
            <SiteSwitcher {...siteSwitch} />
          </Suspense>
        )}
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle theme={theme} />
          <NotificationBell unread={unread} />
          <Link href="/hazards/new" className="report-pill">
            <IconPlus width={18} height={18} strokeWidth={2.4} />
            Report a hazard
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 pb-8 pt-5 sm:px-6 md:pt-8 lg:px-8 lg:pb-12">{children}</main>
      {extras}
      <MobileNav
        user={navUser}
        workBadge={taskBadge}
        hidden={hidden}
        canReport
        menuBadge={certsDue + unread}
        menu={<WorkerMenu variant="sheet" data={{ ...menu, user, certsDue, unread, theme }} />}
      />
    </div>
  );
}
