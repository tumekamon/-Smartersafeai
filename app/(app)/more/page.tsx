import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { moduleVisible } from "@/lib/home-layout";
import { getCompany, listCertifications, listIncidents } from "@/lib/db";
import { certStatus } from "@/lib/metrics";
import { nowMs } from "@/lib/time";
import { switchSiteAction } from "@/lib/actions/site";
import { sitesFor } from "@/lib/scope";
import { switchableSites, usesWorkingSite, workingSite, workingSiteIds } from "@/lib/site-focus";
import { isOpenReport, myReports } from "@/lib/my-reports";
import { unreadCount } from "@/lib/notifications";
import { isPlainWorker } from "@/components/nav-items";
import { logout } from "@/lib/actions/auth";
import { getTheme } from "@/lib/theme";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  IconAlertTriangle,
  IconBell,
  IconChevronRight,
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
 * A worker's More (design canvas W14): Emergency first, in red; then what's about the
 * site (report an incident, the working site) and what's about them (profile and
 * certificates, notifications, appearance, sign out), as flat rows.
 */
async function WorkerMore({ user }: { user: Awaited<ReturnType<typeof getCurrentUser>> }) {
  const now = nowMs();
  const site = await workingSite(user);
  const sites = switchableSites(user);
  const unread = unreadCount(user, now);
  const certs = listCertifications(user.companyId).filter((c) => c.userId === user.id);
  const expired = certs.filter((c) => certStatus(c.expiresOn, now) === "expired").length;
  const expiring = certs.filter((c) => certStatus(c.expiresOn, now) === "expiring").length;
  const incidents = moduleVisible(getCompany(user.companyId), user, "incidents");
  const chevron = <IconChevronRight width={18} height={18} className="shrink-0 text-muted" />;
  const row = "flex min-h-14 items-center gap-3.5 border-b border-border text-base";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 pt-3 lg:pt-0">
      <h1 className="disp text-[40px] leading-none">More</h1>

      <Link href="/emergency" className="flex min-h-[60px] items-center gap-3.5 rounded-xl bg-[#B42318] px-[18px] text-white">
        <IconAlertTriangle width={22} height={22} strokeWidth={2} />
        <span className="flex-1 text-[17px] font-semibold">Emergency</span>
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#FDE8E7]">911 · site line · ER</span>
      </Link>

      <section aria-label="On site" className="flex flex-col">
        <div className="ds-sec">
          <h2 className="eyebrow" style={{ color: "var(--foreground)" }}>On site</h2>
        </div>
        {site && (
          <Link href={`/projects/${site.id}`} className={row}>
            <span className="flex-1">Site details</span>
            <span className="text-sm text-body">Levels, crew, permits</span>
            {chevron}
          </Link>
        )}
        {incidents && (
          <Link href="/incidents/new" className={row}>
            <span className="flex-1">Report an incident</span>
            {chevron}
          </Link>
        )}
        {incidents && (
          <Link href="/incidents" className={row}>
            <span className="flex-1">Incident log</span>
            {chevron}
          </Link>
        )}
        {sites.length <= 1 ? (
          <div className={row}>
            <span className="flex-1">Working site</span>
            <span className="text-sm text-body">{site?.shortName ?? "None yet"}</span>
          </div>
        ) : (
          sites.map((s) => (
            <form key={s.id} action={switchSiteAction}>
              <input type="hidden" name="projectId" value={s.id} />
              <input type="hidden" name="redirectTo" value="/more" />
              <button type="submit" disabled={s.id === site?.id} className={`${row} w-full text-left`}>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{s.shortName}</span>
                  <span className="truncate text-sm text-body">{s.location}</span>
                </span>
                {s.id === site?.id ? <span className="ds-tag ds-tag-info">Working here</span> : <span className="text-sm font-medium text-brand">Switch</span>}
              </button>
            </form>
          ))
        )}
      </section>

      <section aria-label="You" className="flex flex-col">
        <div className="ds-sec">
          <h2 className="eyebrow" style={{ color: "var(--foreground)" }}>You</h2>
        </div>
        <Link href="/settings/profile" className={row}>
          <span className="flex-1">My profile and certificates</span>
          {expired > 0 ? (
            <span className="ds-tag ds-tag-crit">{expired} expired</span>
          ) : expiring > 0 ? (
            <span className="ds-tag ds-tag-warn">{expiring} due</span>
          ) : (
            chevron
          )}
        </Link>
        <Link href="/notifications" className={row}>
          <span className="flex-1">Notifications</span>
          {unread > 0 ? <span className="ds-tag ds-tag-info">{unread} new</span> : chevron}
        </Link>
        <div className={row}>
          <span className="flex-1">Appearance</span>
          <ThemeToggle theme={await getTheme()} />
        </div>
        <form action={logout}>
          <button type="submit" className={`${row} w-full text-left tone-critical`}>
            Sign out
          </button>
        </form>
      </section>
    </div>
  );
}
