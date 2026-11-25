import { getCurrentUser } from "@/lib/dal";
import { switchableSites, usesWorkingSite, workingSite, workingSites } from "@/lib/site-focus";
import { hiddenModules } from "@/lib/home-layout";
import { getCompany, listCorrectiveActions, listFindings } from "@/lib/db";
import { getCapabilities } from "@/lib/authz";
import { brandVars } from "@/lib/color";
import { Topbar } from "@/components/topbar";
import { MobileNav } from "@/components/mobile-nav";
import { OutboxSync } from "@/components/offline/outbox-sync";
import { unreadCount } from "@/lib/notifications";
import { isPlainWorker } from "@/components/nav-items";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const company = getCompany(user.companyId);
  const caps = getCapabilities(user);
  // Workers see one working site at a time; quick actions and badges follow it.
  const projects = (await workingSites(user)).filter((p) => p.status === "active");
  const siteIds = new Set(projects.map((p) => p.id));
  const myOpen = listCorrectiveActions(user.companyId).filter((a) => a.assignedToId === user.id && a.status === "open");
  const current = usesWorkingSite(user) ? await workingSite(user) : undefined;
  const siteSwitch = current
    ? {
        currentId: current.id,
        sites: switchableSites(user).map((p) => ({
          id: p.id,
          shortName: p.shortName,
          location: p.location,
          openTasks: myOpen.filter((a) => a.projectId === p.id).length,
        })),
      }
    : undefined;
  // The Work badge counts what this person must act on: findings to review for
  // safety professionals, their own open tasks for everyone else.
  const workBadge = caps.canReviewFindings
    ? listFindings(user.companyId).filter((f) => f.reviewerDecision === "pending").length
    : caps.isReadOnly
      ? 0
      : myOpen.filter((a) => !usesWorkingSite(user) || siteIds.has(a.projectId)).length;
  const navUser = { role: user.role, readOnly: user.readOnly, extraPermissions: user.extraPermissions };
  const hidden = hiddenModules(company, user);
  // Anyone who can submit field reports gets the yellow Report button (phone tab bar + desktop top bar).
  const canReport = caps.canSubmitInspections;
  // Worker phone screens follow the design canvas: no top bar, each screen carries its own header.
  const worker = isPlainWorker(navUser);

  // Mobile first: one column, a navy top bar, the tab bar at the bottom on phones and
  // tablets (below lg). Desktop is the same work on a bigger screen, tabs in the top bar.
  return (
    <div
      className="tenant-theme flex min-h-screen w-full flex-col bg-background"
      style={company ? (brandVars(company.primaryColor) as React.CSSProperties) : undefined}
    >
      <Topbar
        user={user}
        navUser={navUser}
        hidden={hidden}
        workBadge={workBadge}
        canReport={canReport}
        siteSwitch={siteSwitch}
        unread={usesWorkingSite(user) ? unreadCount(user) : undefined}
        phoneHidden={worker}
      />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pb-8 pt-5 sm:px-6 md:pt-8 lg:px-8 lg:pb-12 lg:pt-10">{children}</main>
      {!caps.isReadOnly && <OutboxSync userId={user.id} />}
      <MobileNav user={navUser} workBadge={workBadge} hidden={hidden} canReport={canReport} />
    </div>
  );
}
