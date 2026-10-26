import { getCurrentUser } from "@/lib/dal";
import { sitesFor } from "@/lib/scope";
import { getCompany, listCorrectiveActions, listFindings } from "@/lib/db";
import { getCapabilities } from "@/lib/authz";
import { brandVars } from "@/lib/color";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { MobileNav } from "@/components/mobile-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const company = getCompany(user.companyId);
  const caps = getCapabilities(user);
  const projects = sitesFor(user).filter((p) => p.status === "active");
  // The Work badge counts what this person must act on: findings to review for
  // safety professionals, their own open tasks for everyone else.
  const workBadge = caps.canReviewFindings
    ? listFindings(user.companyId).filter((f) => f.reviewerDecision === "pending").length
    : caps.isReadOnly
      ? 0
      : listCorrectiveActions(user.companyId).filter((a) => a.assignedToId === user.id && a.status === "open").length;
  const navUser = { role: user.role, readOnly: user.readOnly };

  return (
    <div
      className="tenant-theme flex min-h-screen w-full bg-background"
      style={company ? (brandVars(company.primaryColor) as React.CSSProperties) : undefined}
    >
      <Sidebar user={navUser} companyName={company?.name ?? ""} badges={{ work: workBadge }} projectCount={projects.length} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar user={user} />
        <main className="flex-1 px-4 pb-28 pt-6 md:px-8 md:py-8">{children}</main>
      </div>
      <MobileNav
        user={navUser}
        workBadge={workBadge}
        projects={projects.map((p) => ({ id: p.id, shortName: p.shortName }))}
        flags={{
          canInspect: caps.canSubmitInspections,
          canReportIncident: !caps.isReadOnly,
          canCreateAction: caps.canCreateCorrectiveActions,
          canManageCompliance: caps.canManageCompliance,
        }}
      />
    </div>
  );
}
