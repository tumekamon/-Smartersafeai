import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { moduleVisible } from "@/lib/home-layout";
import { getCompany, listIncidents, listProjects } from "@/lib/db";
import { logout } from "@/lib/actions/auth";
import {
  IconAlertTriangle,
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
  const caps = getCapabilities(user);
  const activeProjects = listProjects(user.companyId).filter((p) => p.status === "active").length;
  const openIncidents = listIncidents(user.companyId).filter((i) => i.status !== "closed").length;

  const tiles = [
    { href: "/projects", label: "Projects", meta: `${activeProjects} active`, Icon: IconFolder, show: true },
    { href: "/incidents", label: "Incidents", meta: `${openIncidents} open`, Icon: IconAlertTriangle, show: moduleVisible(getCompany(user.companyId), user, "incidents") },
    { href: "/reports", label: "Reports", meta: "Print, PDF or CSV", Icon: IconFileText, show: caps.canViewReports },
    { href: "/settings#templates", label: "Templates", meta: "Daily checklists", Icon: IconFileText, show: caps.canManageTemplates },
    { href: "/settings/home", label: "Role screens", meta: "What each role sees", Icon: IconGrid, show: caps.canManageSettings },
    { href: "/settings/team", label: "Team", meta: "People & role levels", Icon: IconUsers, show: caps.canManageSettings },
    { href: "/settings", label: "Settings", meta: caps.canManageSettings ? "Branding, hazards" : "Preferences", Icon: IconSettings, show: true },
    { href: "/settings/profile", label: "My profile", meta: "Name & title", Icon: IconUser, show: true },
  ].filter((t) => t.show);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">More</h1>

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

      <form action={logout} className="md:hidden">
        <button type="submit" className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-surface text-base font-bold text-critical ring-1 ring-border">
          <IconLogout width={20} height={20} strokeWidth={2} />
          Log out
        </button>
      </form>
    </div>
  );
}
