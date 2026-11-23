import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { getProject } from "@/lib/db";
import { isSiteScoped, sitesFor } from "@/lib/scope";
import { switchableSites, workingSite } from "@/lib/site-focus";
import { ManagerDashboard } from "@/components/dashboard/manager-dashboard";
import { WorkerDashboard } from "@/components/dashboard/worker-dashboard";
import { ClientDashboard } from "@/components/dashboard/client-dashboard";
import { AdminSetup } from "@/components/dashboard/admin-setup";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; view?: string }>;
}) {
  const user = await getCurrentUser();
  const capabilities = getCapabilities(user);
  const { project, view } = await searchParams;

  if (capabilities.isReadOnly) return <ClientDashboard user={user} />;
  // The owner lands on Setup (design AP1); the safety picture is one tap away.
  if (user.role === "ADMIN" && view !== "safety") return <AdminSetup user={user} />;

  // Someone on only some sites always sees one of their sites, never company-wide numbers.
  const sites = sitesFor(user);
  const scoped = isSiteScoped(user);
  const projectId = project && sites.some((s) => s.id === project) ? project : scoped ? sites[0]?.id : undefined;
  if (!capabilities.canViewOrgDashboard) {
    return <WorkerDashboard user={user} site={await workingSite(user)} sites={switchableSites(user)} />;
  }

  return (
    <ManagerDashboard
      user={user}
      project={projectId ? getProject(projectId) : undefined}
      canCustomize={capabilities.canCustomizeDashboard}
      showAllSites={!scoped}
    />
  );
}
