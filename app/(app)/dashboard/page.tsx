import { getCurrentUser } from "@/lib/dal";
import { getCapabilities } from "@/lib/authz";
import { getProject } from "@/lib/db";
import { isSiteScoped, sitesFor } from "@/lib/scope";
import { ManagerDashboard } from "@/components/dashboard/manager-dashboard";
import { WorkerDashboard } from "@/components/dashboard/worker-dashboard";
import { ClientDashboard } from "@/components/dashboard/client-dashboard";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const user = await getCurrentUser();
  const capabilities = getCapabilities(user);
  const { project } = await searchParams;

  if (capabilities.isReadOnly) return <ClientDashboard user={user} />;

  // Someone on only some sites always sees one of their sites, never company-wide numbers.
  const sites = sitesFor(user);
  const scoped = isSiteScoped(user);
  const projectId = project && sites.some((s) => s.id === project) ? project : scoped ? sites[0]?.id : undefined;
  if (!capabilities.canViewOrgDashboard) return <WorkerDashboard user={user} />;

  return (
    <ManagerDashboard
      user={user}
      project={projectId ? getProject(projectId) : undefined}
      canCustomize={capabilities.canCustomizeDashboard}
      showAllSites={!scoped}
    />
  );
}
