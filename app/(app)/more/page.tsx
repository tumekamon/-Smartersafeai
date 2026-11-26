import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { moduleVisible } from "@/lib/home-layout";
import { getCompany, listIncidents } from "@/lib/db";
import { nowMs } from "@/lib/time";
import { sitesFor } from "@/lib/scope";
import { switchableSites, usesWorkingSite, workingSite, workingSiteIds } from "@/lib/site-focus";
import { isOpenReport, myReports } from "@/lib/my-reports";
import { unreadCount } from "@/lib/notifications";
import { isPlainWorker } from "@/components/nav-items";
import { logout } from "@/lib/actions/auth";
import { getTheme } from "@/lib/theme";
import { ThemeToggle } from "@/components/theme-toggle";
import { WorkerMenu } from "@/components/worker/worker-menu";
import { certSummary } from "@/lib/worker-summary";
import {
  IconAlertTriangle,
  IconBell,
  IconCamera,
  IconSiren,
  IconFileText,
  IconFolder,
  IconGrid,
  IconLogout,
  IconSettings,
  IconUser,
  IconUsers,
} from "@/components/ui/icons";

/** Everything that isn't daily site work, as big tiles: one tap, no hunting through menus. */
export default async function MorePage() {
  const user = await getCurrentUser();
  if (isPlainWorker(user)) return <WorkerMore user={user} />;
  const caps = getCapabilities(user);
  // Count only the sites this person works on, matching the list behind the tile.
  const activeProjects = sitesFor(user).filter((p) => p.status === "active").length;
  // Same scope as the Incidents page: a worker's working site, everyone else their sites.
  const incidentSites = await workingSiteIds(user);
  const openIncidents = listIncidents(user.companyId).filter((i) => i.status !== "closed" && incidentSites.has(i.projectId)).length;

  // Worker-only tiles: their own reports, notifications and the emergency screen.
  const worker = usesWorkingSite(user);
  const reportsOpen = worker ? myReports(user).filter(isOpenReport).length : 0;
  const unread = worker ? unreadCount(user) : 0;

  const isOwner = user.role === "ADMIN" && !user.readOnly;
  const tiles = [
    { href: "/emergency", label: "Emergency", meta: "911, first aid, muster", Icon: IconSiren, show: worker },
    { href: "/my-reports", label: "My reports", meta: reportsOpen ? `${reportsOpen} in progress` : "What you reported", Icon: IconCamera, show: worker && !isPlainWorker(user) },
    { href: "/notifications", label: "Notifications", meta: unread ? `${unread} new` : "All caught up", Icon: IconBell, show: worker },
    // The owner's tabs are Setup/Team/Sites, so the day-to-day areas live here for them.
    { href: "/dashboard?view=safety", label: "Safety picture", meta: "Score, trends, hotspots", Icon: IconGrid, show: isOwner },
    { href: "/work", label: "Work", meta: "Review, assign, fixes", Icon: IconFileText, show: isOwner },
    { href: "/compliance", label: "Compliance", meta: "Certs, permits, PPE", Icon: IconFileText, show: isOwner },
    { href: "/daily-reports", label: "Daily site reports", meta: "Due 08:00", Icon: IconFileText, show: isOwner },
    { href: "/projects", label: isOwner ? "Sites" : "Projects", meta: `${activeProjects} active`, Icon: IconFolder, show: !isOwner },
    { href: "/incidents", label: "Incidents", meta: `${openIncidents} open`, Icon: IconAlertTriangle, show: moduleVisible(getCompany(user.companyId), user, "incidents") },
    { href: "/reports", label: "Reports", meta: "Print, PDF or CSV", Icon: IconFileText, show: caps.canViewReports },
    { href: "/settings#templates", label: "Templates", meta: "Daily checklists", Icon: IconFileText, show: caps.canManageTemplates },
    { href: "/settings/home", label: "Role screens", meta: "What each role sees", Icon: IconGrid, show: caps.canManageSettings },
    { href: "/settings/team", label: "Team", meta: "People & role levels", Icon: IconUsers, show: caps.canManageSettings },
    { href: "/settings", label: "Settings", meta: caps.canManageSettings ? "Branding, hazards" : "Preferences", Icon: IconSettings, show: true },
    { href: "/settings/profile", label: "My profile", meta: "Details & certifications", Icon: IconUser, show: true },
  ].filter((t) => t.show);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="disp text-[28px] leading-tight sm:text-3xl lg:text-4xl">More</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map(({ href, label, meta, Icon }) => (
          <Link
            key={href}
            href={href}
            className="card flex min-h-32 flex-col justify-between gap-3 p-4 transition-shadow hover:shadow-md"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-muted text-brand">
              <Icon width={24} height={24} strokeWidth={2} />
            </span>
            <span>
              <span className="block text-base font-bold">{label}</span>
              <span className="block text-sm text-foreground/60">{meta}</span>
            </span>
          </Link>
        ))}

      </div>

      <section className="card flex items-center justify-between gap-4 p-4 sm:hidden">
        <span>
          <span className="block text-base font-bold">Appearance</span>
          <span className="block text-sm text-foreground/60">Light, dark or match the phone</span>
        </span>
        <ThemeToggle theme={await getTheme()} />
      </section>

      <form action={logout} className="lg:hidden">
        <button type="submit" className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-surface text-base font-bold text-critical ring-1 ring-border">
          <IconLogout width={20} height={20} strokeWidth={2} />
          Log out
        </button>
      </form>
    </div>
  );
}

/**
 * A worker's menu as a page (desktop; on phones the More tab opens the same menu as a
 * sheet). Same contents: who you are, Emergency, shortcuts, working site, settings.
 */
async function WorkerMore({ user }: { user: Awaited<ReturnType<typeof getCurrentUser>> }) {
  const now = nowMs();
  const site = await workingSite(user);
  const data = {
    user,
    site,
    sites: switchableSites(user),
    certsDue: certSummary(user, now).due.length,
    unread: unreadCount(user, now),
    incidents: moduleVisible(getCompany(user.companyId), user, "incidents"),
    theme: await getTheme(),
  };
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <span className="eyebrow">Settings and shortcuts</span>
        <h1 className="disp text-[32px] leading-tight sm:text-[36px]">Menu</h1>
      </header>
      <WorkerMenu variant="page" data={data} />
    </div>
  );
}
